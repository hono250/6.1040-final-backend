import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "User" + ".";

// Internal entity types, represented as IDs
export type User = ID;

/**
 * State: A set of Users.
 */
export interface UserDoc {
    _id: User;
    createdAt: Date;
}

/**
 * @concept User
 * @purpose Manage user accounts.
 */
export default class UserConcept {
    users: Collection<UserDoc>;

    constructor(private readonly db: Db) {
        this.users = this.db.collection(PREFIX + "users");
    }

    /**
     * Action: createUser
     * @effects Creates new User, returns userId
     */
    async createUser(): Promise<{ userId: User }> {
        const userId = freshID() as User;

        await this.users.insertOne({
            _id: userId,
            createdAt: new Date(),
        });

        return { userId };
    }

    /**
     * Action: deleteUser
     * @requires User exists
     * @effects Removes User
     */
    async deleteUser(
        { userId }: { userId: User },
    ): Promise<Empty | { error: string }> {
        const userDoc = await this.users.findOne({ _id: userId });
        if (!userDoc) {
            return { error: "User not found." };
        }

        await this.users.deleteOne({ _id: userId });

        return {};
    }

    /**
     * Query: isUser
     */
    async isUser(userId: User): Promise<boolean> {
        const count = await this.users.countDocuments({ _id: userId }, { limit: 1 });
        return count > 0;
    }

    /**
     * Query: _getAllUsers
     */
    async _getAllUsers(): Promise<User[]> {
        const users = await this.users.find({}).sort({ createdAt: 1 }).toArray();
        return users.map((u) => u._id);
    }
}
