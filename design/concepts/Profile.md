# Concept: Profile

## Purpose
Manage user profile information.

## Principle
Users have a profile containing display information like their name. This information can be updated.

## State
    a set of Profiles with
      a userId User
      a displayName String

## Actions

`createProfile (userId: User, displayName: String)`
- **Requires**: 
  - displayName is non-empty
- **Effect**: Creates new Profile with displayName

`updateDisplayName (userId: User, displayName: String)`
- **Requires**: 
  - Profile exists for user
  - displayName is non-empty
- **Effect**: Updates profile.displayName

`deleteProfile (userId: User)`
- **Requires**: Profile exists for user
- **Effect**: Removes Profile

`getProfile (userId: User): (profile: Profile)`
- **Effect**: Returns profile if exists, or null if not found
