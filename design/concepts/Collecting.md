# Concept: Collecting [Item, User]

## Purpose
Organize items into shared collections with member access.

## Principle
After creating a collection, members can add items and other members, and all members can access the collection's items.

## State
    a set of Collections with
      an owner  User
      a name String
      a members set of Users
      an items set of Items

## Actions

`create (owner: User, name: String): (collection: Collection)`
- **Effect**: Creates new collection with owner as initial member, returns collection

`addMember (collection: Collection, user: User, addedBy: User)`
- **Requires**: `addedBy` is in collection members
- **Effect**: Adds `user` to collection members

`removeMember (collection: Collection, user: User, requestedBy: User)`
- **Requires**: 
  - `requestedBy` is collection owner
  - `user` is not the owner
- **Effect**: Removes `user` from collection members

`leave (collection: Collection, user: User)`
- **Requires**:
  -  `user` is in collection members
  - `user` is not the owner
  effect removes user from collection members

`addItem (collection: Collection, item: Item, addedBy: User)`
- **Requires**: `addedBy` is in collection members
- **Effect**: Adds `item` to collection items

`removeItem (collection: Collection, item: Item, removedBy: User)`
- **Requires**: `removedBy` is in collection members
- **Effect**: Removes `item` from collection items

`getItems (collection: Collection, requestingUser: User): (items: set of Item)`
- **Requires**: `requestingUser` is in collection members
- **Effect**: Returns all items in collection

`getMembers (collection: Collection): (members: set of User)`
- **Effect**: Returns all members of collection

`getCollections (user: User): (collections: set of Collection)`
- **Effect**: Returns all collections where `user` is a member

`rename (collection: Collection, newName: String, requestedBy: User)`
- **Requires**: `requestedBy` is collection owner
- **Effect**: Updates collection name

`delete (collection: Collection, requestedBy: User)`
- **Requires**: `requestedBy` is collection owner
- **Effect**: Removes collection

## Notes
- Any member of a collection can add or remove items
- Only owner can remove other members
- Members (except owner) can leave voluntarily 
- When a user leaves/is removed: items added by that user stay in collection
- Only the owner can rename or delete the collection
- When a collection is deleted, the items and users remain in the system; only the collection organization is removed
- A single-member collection is simply a collection where the owner has not added any other members
- Collections store references to items, not copies of the items themselves