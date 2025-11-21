import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Collecting" + ".";

// Generic types for the concept's external dependencies
type Item = ID;
type User = ID;

// Internal entity type
type CollectionEntity = ID;

/**
 * State: A set of Collections with an owner, name, members, and items.
 */
interface CollectionDoc {
  _id: CollectionEntity;
  owner: User;
  name: string;
  members: User[];
  items: Item[];
}

/**
 * @concept Collecting [Item, User]
 * @purpose Organize items into shared collections with member access.
 * @principle After creating a collection, members can add items and other members,
 * and all members can access the collection's items.
 */
export default class CollectingConcept {
  collections: Collection<CollectionDoc>;

  constructor(private readonly db: Db) {
    this.collections = this.db.collection(PREFIX + "collections");
  }

  /**
   * Action: Creates a new collection.
   * @requires None
   * @effects Creates new collection with owner as initial member, returns collection ID
   */
  async create(
    { owner, name }: { owner: User; name: string }
  ): Promise<{ collection: CollectionEntity }> {
    const collectionId = freshID() as CollectionEntity;
    await this.collections.insertOne({
      _id: collectionId,
      owner,
      name,
      members: [owner], // owner is initial member
      items: [],
    });
    return { collection: collectionId };
  }

  /**
   * Action: Adds a member to a collection.
   * @requires addedBy is in collection members
   * @effects Adds user to collection members
   */
  async addMember(
    { collection, user, addedBy }: { collection: CollectionEntity; user: User; addedBy: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (!collectionDoc.members.includes(addedBy)) {
      return { error: "Only members can add other members to the collection." };
    }

    if (collectionDoc.members.includes(user)) {
      return { error: "User is already a member of this collection." };
    }

    await this.collections.updateOne(
      { _id: collection },
      { $push: { members: user } }
    );

    return {};
  }

  /**
   * Action: Removes a member from a collection.
   * @requires requestedBy is collection owner, user is not the owner
   * @effects Removes user from collection members
   */
  async removeMember(
    { collection, user, requestedBy }: { collection: CollectionEntity; user: User; requestedBy: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (collectionDoc.owner !== requestedBy) {
      return { error: "Only the owner can remove members from the collection." };
    }

    if (collectionDoc.owner === user) {
      return { error: "The owner cannot be removed from the collection." };
    }

    if (!collectionDoc.members.includes(user)) {
      return { error: "User is not a member of this collection." };
    }

    await this.collections.updateOne(
      { _id: collection },
      { $pull: { members: user } }
    );

    return {};
  }

  /**
   * Action: User leaves a collection voluntarily.
   * @requires user is in collection members, user is not the owner
   * @effects Removes user from collection members
   */
  async leave(
    { collection, user }: { collection: CollectionEntity; user: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (!collectionDoc.members.includes(user)) {
      return { error: "User is not a member of this collection." };
    }

    if (collectionDoc.owner === user) {
      return { error: "The owner cannot leave the collection." };
    }

    await this.collections.updateOne(
      { _id: collection },
      { $pull: { members: user } }
    );

    return {};
  }

  /**
   * Action: Adds an item to a collection.
   * @requires addedBy is in collection members
   * @effects Adds item to collection items
   */
  async addItem(
    { collection, item, addedBy }: { collection: CollectionEntity; item: Item; addedBy: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (!collectionDoc.members.includes(addedBy)) {
      return { error: "Only members can add items to the collection." };
    }

    if (collectionDoc.items.includes(item)) {
      return { error: "Item is already in this collection." };
    }

    await this.collections.updateOne(
      { _id: collection },
      { $push: { items: item } }
    );

    return {};
  }

  /**
   * Action: Removes an item from a collection.
   * @requires removedBy is in collection members
   * @effects Removes item from collection items
   */
  async removeItem(
    { collection, item, removedBy }: { collection: CollectionEntity; item: Item; removedBy: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (!collectionDoc.members.includes(removedBy)) {
      return { error: "Only members can remove items from the collection." };
    }

    if (!collectionDoc.items.includes(item)) {
      return { error: "Item is not in this collection." };
    }

    await this.collections.updateOne(
      { _id: collection },
      { $pull: { items: item } }
    );

    return {};
  }

  /**
   * Action: Renames a collection.
   * @requires requestedBy is collection owner
   * @effects Updates collection name
   */
  async rename(
    { collection, newName, requestedBy }: { collection: CollectionEntity; newName: string; requestedBy: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (collectionDoc.owner !== requestedBy) {
      return { error: "Only the owner can rename the collection." };
    }

    await this.collections.updateOne(
      { _id: collection },
      { $set: { name: newName } }
    );

    return {};
  }

  /**
   * Action: Deletes a collection.
   * @requires requestedBy is collection owner
   * @effects Removes collection
   */
  async delete(
    { collection, requestedBy }: { collection: CollectionEntity; requestedBy: User }
  ): Promise<Empty | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (collectionDoc.owner !== requestedBy) {
      return { error: "Only the owner can delete the collection." };
    }

    await this.collections.deleteOne({ _id: collection });

    return {};
  }

  /**
   * System Action: Removes an item from all collections system-wide.
   * @effects Removes item from all collections across all users
   */
  async removeItemSystemwide(
    { item }: { item: Item }
  ): Promise<Empty> {
    await this.collections.updateMany(
      { items: item },
      { $pull: { items: item } }
    );

    return {};
  }

  /**
   * Query: Gets all items in a collection.
   * @requires requestingUser is in collection members
   * @effects Returns all items in collection
   */
  async _getItems(
    { collection, requestingUser }: { collection: CollectionEntity; requestingUser: User }
  ): Promise<{ items: Item[] } | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    if (!collectionDoc.members.includes(requestingUser)) {
      return { error: "Only members can view collection items." };
    }

    return { items: collectionDoc.items };
  }

  /**
   * Query: Gets all members of a collection.
   * @effects Returns all members of collection
   */
  async _getMembers(
    { collection }: { collection: CollectionEntity }
  ): Promise<{ members: User[] } | { error: string }> {
    const collectionDoc = await this.collections.findOne({ _id: collection });
    if (!collectionDoc) {
      return { error: `Collection with ID ${collection} not found.` };
    }

    return { members: collectionDoc.members };
  }

  /**
   * Query: Gets all collections where user is a member.
   * @effects Returns all collections where user is a member
   */
  async _getCollections(
    { user }: { user: User }
  ): Promise<CollectionDoc[]> {
    return await this.collections.find({ members: user }).toArray();
  }

  /**
   * Query: Gets all collections where user is a member with item status.
   * @effects Returns all collections where user is a member, with a flag indicating whether item is in each collection
   */
  async _getCollectionsWithItemStatus(
    { user, item }: { user: User; item: Item }
  ): Promise<Array<{ collection: CollectionDoc; hasItem: boolean }>> {
    const userCollections = await this.collections.find({ members: user }).toArray();
    
    return userCollections.map(collection => ({
      collection,
      hasItem: collection.items.includes(item)
    }));
  }
}