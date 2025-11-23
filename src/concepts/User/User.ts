import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import bcrypt from "npm:bcryptjs";

// Collection prefix to ensure namespace separation
const PREFIX = "User" + ".";

// Internal entity types, represented as IDs
export type User = ID;

/**
 * State: A set of Users with profile info.
 */
export interface UserDoc {
    _id: User;
    email: string;
    passwordHash: string;
    displayName: string;
    createdAt: Date;
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
 * @concept User
 * @purpose Manage user accounts with authentication and profile information.
 */
export default class UserConcept {
    users: Collection<UserDoc>;
    sessions: Collection<SessionDoc>;

    constructor(private readonly db: Db) {
        this.users = this.db.collection(PREFIX + "users");
        this.sessions = this.db.collection(PREFIX + "sessions");
    }

    /**
     * Action: register
     * @requires No User exists with email
     * @requires Email is valid format
     * @requires Password meets minimum requirements
     * @requires displayName is non-empty
     * @effects Creates new User, Session, returns userId and token
     */
    async register(
        { email, password, displayName }: {
            email: string;
            password: string;
            displayName: string;
        },
    ): Promise<{ userId: User; token: string } | { error: string }> {
        // Validation
        if (!email.includes("@") || !email.includes(".")) {
            return { error: "Invalid email format." };
        }
        if (password.length < 8) {
            return { error: "Password must be at least 8 characters." };
        }
        if (!displayName || displayName.trim() === "") {
            return { error: "Display name cannot be empty." };
        }

        const existingUser = await this.users.findOne({ email });
        if (existingUser) {
            return { error: "User with this email already exists." };
        }

        // Create User
        const userId = freshID() as User;
        const passwordHash = await bcrypt.hash(password, 10);

        await this.users.insertOne({
            _id: userId,
            email,
            passwordHash,
            displayName,
            createdAt: new Date(),
        });

        // Create Session
        const token = freshID(); // Using freshID as a random token
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await this.sessions.insertOne({
            _id: new ObjectId(),
            user: userId,
            token,
            createdAt: now,
            expiresAt,
        });

        return { userId, token };
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
        const user = await this.users.findOne({ email });
        if (!user) {
            return { error: "Invalid email or password." };
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return { error: "Invalid email or password." };
        }

        // Create Session
        const token = freshID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await this.sessions.insertOne({
            _id: new ObjectId(),
            user: user._id,
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
     * Action: updateDisplayName
     * @requires User exists
     * @requires displayName is non-empty
     * @effects Updates user.displayName
     */
    async updateDisplayName(
        { user, displayName }: { user: User; displayName: string },
    ): Promise<Empty | { error: string }> {
        if (!displayName || displayName.trim() === "") {
            return { error: "Display name cannot be empty." };
        }

        const result = await this.users.updateOne(
            { _id: user },
            { $set: { displayName } },
        );

        if (result.matchedCount === 0) {
            return { error: "User not found." };
        }

        return {};
    }

    /**
     * Action: updatePassword
     * @requires User exists
     * @requires oldPassword matches stored passwordHash
     * @requires newPassword meets minimum requirements
     * @effects Updates passwordHash
     */
    async updatePassword(
        { user, oldPassword, newPassword }: {
            user: User;
            oldPassword: string;
            newPassword: string;
        },
    ): Promise<Empty | { error: string }> {
        const userDoc = await this.users.findOne({ _id: user });
        if (!userDoc) {
            return { error: "User not found." };
        }

        const match = await bcrypt.compare(oldPassword, userDoc.passwordHash);
        if (!match) {
            return { error: "Incorrect old password." };
        }

        if (newPassword.length < 8) {
            return { error: "New password must be at least 8 characters." };
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.users.updateOne(
            { _id: user },
            { $set: { passwordHash: newHash } },
        );

        return {};
    }

    /**
     * Action: deleteUser
     * @requires User exists
     * @effects Removes all Sessions for user, removes User
     */
    async deleteUser(
        { user }: { user: User },
    ): Promise<Empty | { error: string }> {
        const userDoc = await this.users.findOne({ _id: user });
        if (!userDoc) {
            return { error: "User not found." };
        }

        await this.sessions.deleteMany({ user });
        await this.users.deleteOne({ _id: user });

        return {};
    }

    /**
     * Query: _getUser
     */
    async _getUser(
        { userId }: { userId: User },
    ): Promise<Array<{ user: UserDoc } | { error: string }>> {
        const user = await this.users.findOne({ _id: userId });
        if (!user) {
            return [{ error: "User not found." }];
        }
        return [{ user }];
    }

    /**
     * Query: _getUserByEmail
     */
    async _getUserByEmail(
        { email }: { email: string },
    ): Promise<Array<{ userId: User } | { error: string }>> {
        const user = await this.users.findOne({ email });
        if (!user) {
            return [{ error: "User not found." }];
        }
        return [{ userId: user._id }];
    }

    /**
     * Query: _getSessionUser
     */
    async _getSessionUser(
        { token }: { token: string },
    ): Promise<Array<{ userId: User } | { error: string }>> {
        const session = await this.sessions.findOne({ token });
        if (!session) {
            return [{ error: "Session not found." }];
        }
        if (session.expiresAt < new Date()) {
            // Optionally clean up expired session here or let authenticate handle it
            return [{ error: "Session expired." }];
        }
        return [{ userId: session.user }];
    }

    /**
     * Query: _getAllUsers
     */
    async _getAllUsers(): Promise<User[]> {
        const users = await this.users.find({}).sort({ createdAt: 1 }).toArray();
        return users.map((u) => u._id);
    }
}
