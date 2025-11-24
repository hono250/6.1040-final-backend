# Concept: User

## Purpose
Manage user accounts.

## Principle
A user is a unique entity in the system.

## State
    a set of Users with
      an _id User
      a createdAt DateTime

## Actions

`createUser (): (userId: User)`
- **Effect**: 
  - Creates new User
  - Returns userId

`deleteUser (userId: User)`
- **Requires**: User exists
- **Effect**: 
  - Removes User

`isUser (userId: User): (exists: Boolean)`
- **Effect**: Returns true if user exists, false otherwise

`_getAllUsers (): (userIds: seq of User)`
- **Effect**: Returns all user IDs ordered by createdAt
