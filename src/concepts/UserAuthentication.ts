import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as bcrypt from "npm:bcryptjs";

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuthentication" + ".";

export type User = ID;

/**
 * State: Authentication credentials.
 */
export interface AuthDoc {
    userId: User;
    email: string;
    passwordHash: string;
}

/**
 * State: A set of Sessions.
 */
export interface SessionDoc {
    _id: ObjectId;
    user: User;
    token: string;
    createdAt: Date;
    expiresAt: Date;
}

/**
 * @concept UserAuthentication
 * @purpose Manage user authentication, credentials, and sessions.
 */
export default class UserAuthenticationConcept {
    auths: Collection<AuthDoc>;
    sessions: Collection<SessionDoc>;

    constructor(private readonly db: Db) {
        this.auths = this.db.collection(PREFIX + "auths");
        this.sessions = this.db.collection(PREFIX + "sessions");
    }

    /**
     * Action: createAuth
     * @purpose Internal use by User.register
     */
    async createAuth(
        { userId, email, password }: { userId: User; email: string; password: string },
    ): Promise<Empty | { error: string }> {
        // Validation
        if (!email.includes("@") || !email.includes(".")) {
            return { error: "Invalid email format." };
        }
        if (password.length < 8) {
            return { error: "Password must be at least 8 characters." };
        }

        const existingUser = await this.auths.findOne({ email });
        if (existingUser) {
            return { error: "User with this email already exists." };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await this.auths.insertOne({
            userId,
            email,
            passwordHash,
        });

        return {};
    }

    /**
     * Action: login
     * @requires User exists with email
     * @requires Password matches stored passwordHash
     * @effects Creates Session, returns token
     */
    async login(
        { email, password }: { email: string; password: string },
    ): Promise<{ token: string } | { error: string }> {
        const auth = await this.auths.findOne({ email });
        if (!auth) {
            return { error: "Invalid email or password." };
        }

        const match = await bcrypt.compare(password, auth.passwordHash);
        if (!match) {
            return { error: "Invalid email or password." };
        }

        // Create Session
        const token = freshID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await this.sessions.insertOne({
            _id: new ObjectId(),
            user: auth.userId,
            token,
            createdAt: now,
            expiresAt,
        });

        return { token };
    }

    /**
     * Action: logout
     * @requires Session exists with token
     * @effects Removes Session
     */
    async logout(
        { token }: { token: string },
    ): Promise<Empty | { error: string }> {
        const result = await this.sessions.deleteOne({ token });
        if (result.deletedCount === 0) {
            return { error: "Session not found." };
        }
        return {};
    }

    /**
     * Action: authenticate
     * @requires Session exists with token
     * @requires Session.expiresAt > current time
     * @effects Updates session.expiresAt, returns userId
     */
    async authenticate(
        { token }: { token: string },
    ): Promise<{ userId: User } | { error: string }> {
        const session = await this.sessions.findOne({ token });
        if (!session) {
            return { error: "Invalid session." };
        }

        const now = new Date();
        if (session.expiresAt < now) {
            await this.sessions.deleteOne({ _id: session._id });
            return { error: "Session expired." };
        }

        // Refresh session
        const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await this.sessions.updateOne(
            { _id: session._id },
            { $set: { expiresAt: newExpiresAt } },
        );

        return { userId: session.user };
    }

    /**
     * Action: updatePassword
     * @requires User exists
     * @requires oldPassword matches stored passwordHash
     * @requires newPassword meets minimum requirements
     * @effects Updates passwordHash
     */
    async updatePassword(
        { userId, oldPassword, newPassword }: {
            userId: User;
            oldPassword: string;
            newPassword: string;
        },
    ): Promise<Empty | { error: string }> {
        const auth = await this.auths.findOne({ userId });
        if (!auth) {
            return { error: "User not found." };
        }

        const match = await bcrypt.compare(oldPassword, auth.passwordHash);
        if (!match) {
            return { error: "Incorrect old password." };
        }

        if (newPassword.length < 8) {
            return { error: "New password must be at least 8 characters." };
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.auths.updateOne(
            { userId },
            { $set: { passwordHash: newHash } },
        );

        return {};
    }

    /**
     * Action: deleteAuth
     * @purpose Internal use by User.deleteUser
     */
    async deleteAuth(
        { userId }: { userId: User },
    ): Promise<Empty> {
        await this.sessions.deleteMany({ user: userId });
        await this.auths.deleteOne({ userId });
        return {};
    }

    /**
     * Query: getByEmail
     */
    async getByEmail(email: string): Promise<AuthDoc | null> {
        return await this.auths.findOne({ email });
    }

    /**
     * Query: getSessionUser
     */
    async getSessionUser(token: string): Promise<{ userId: User } | null> {
        const session = await this.sessions.findOne({ token });
        if (!session || session.expiresAt < new Date()) {
            return null;
        }
        return { userId: session.user };
    }
}
