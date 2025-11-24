import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Profile" + ".";

export type User = ID;

/**
 * State: User profile information.
 */
export interface ProfileDoc {
    userId: User;
    displayName: string;
}

/**
 * @concept Profile
 * @purpose Manage user profile information.
 */
export default class ProfileConcept {
    profiles: Collection<ProfileDoc>;

    constructor(private readonly db: Db) {
        this.profiles = this.db.collection(PREFIX + "profiles");
    }

    /**
     * Action: createProfile
     * @purpose Internal use by User.register
     */
    async createProfile(
        { userId, displayName }: { userId: User; displayName: string },
    ): Promise<Empty | { error: string }> {
        if (!displayName || displayName.trim() === "") {
            return { error: "Display name cannot be empty." };
        }

        await this.profiles.insertOne({
            userId,
            displayName,
        });

        return {};
    }

    /**
     * Action: updateDisplayName
     * @requires User exists
     * @requires displayName is non-empty
     * @effects Updates user.displayName
     */
    async updateDisplayName(
        { userId, displayName }: { userId: User; displayName: string },
    ): Promise<Empty | { error: string }> {
        if (!displayName || displayName.trim() === "") {
            return { error: "Display name cannot be empty." };
        }

        const result = await this.profiles.updateOne(
            { userId },
            { $set: { displayName } },
        );

        if (result.matchedCount === 0) {
            return { error: "Profile not found." };
        }

        return {};
    }

    /**
     * Action: deleteProfile
     * @purpose Internal use by User.deleteUser
     */
    async deleteProfile(
        { userId }: { userId: User },
    ): Promise<Empty> {
        await this.profiles.deleteOne({ userId });
        return {};
    }

    /**
     * Query: getProfile
     */
    async getProfile(userId: User): Promise<ProfileDoc | null> {
        return await this.profiles.findOne({ userId });
    }
}
