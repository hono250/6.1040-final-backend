# Concept: User

## Purpose
Manage user accounts with authentication and profile information.

## Principle
A user registers with an email, password, and display name. After registration, they can log in with their credentials to access the app. Sessions persist until logout or expiration. Users can update their profile information at any time.

## State
    a set of Users with
      an email String
      a passwordHash String       # Hashed password for security
      a displayName String
      a createdAt DateTime

    a set of Sessions with
      a user User
      a token String
      a createdAt DateTime
      an expiresAt DateTime       # Valid for 30 days

## Actions

`register (email: String, password: String, displayName: String): (userId: String, token: String)`
- **Requires**: 
  - No User exists with email
  - Email is valid format
  - Password meets minimum requirements (e.g., 8+ characters)
  - displayName is non-empty
- **Effect**: Creates new User with email, hashed password, and displayName, sets createdAt to current time, creates Session with fresh random token, returns userId and token

`login (email: String, password: String): (token: String)`
- **Requires**: 
  - User exists with email
  - Password matches stored passwordHash
- **Effect**: Creates Session with fresh random token, sets createdAt to current time, sets expiresAt to 30 days from now, returns token

`logout (token: String)`
- **Requires**: Session exists with token
- **Effect**: Removes Session

`authenticate (token: String): (userId: String)`
- **Requires**: 
  - Session exists with token
  - Session.expiresAt > current time
- **Effect**: Updates session.expiresAt to 30 days from now (refreshes session), returns session.user's ID

`updateDisplayName (user: User, displayName: String)`
- **Requires**: 
  - User exists
  - displayName is non-empty
- **Effect**: Updates user.displayName

`updatePassword (user: User, oldPassword: String, newPassword: String)`
- **Requires**:
  - User exists
  - oldPassword matches stored passwordHash
  - newPassword meets minimum requirements
- **Effect**: Updates passwordHash with new hashed password

`deleteUser (user: User)`
- **Requires**: User exists
- **Effect**: Removes all Sessions for user, removes User

`_getUser (userId: String): (user: User)`
- **Effect**: Returns user if exists, or error if not found

`_getUserByEmail (email: String): (userId: String)`
- **Effect**: Returns userId for email, or null if not found

`_getSessionUser (token: String): (userId: String)`
- **Effect**: Returns userId for token, or null if invalid/expired

`_getAllUsers (): (userIds: seq of String)`
- **Effect**: Returns all user IDs ordered by createdAt

## Notes
- Each email is unique across all Users
- Each token is unique across all active Sessions
- Sessions expire after 30 days of inactivity
- Passwords are never stored in plain text, only as secure hashes
- Email validation should check for proper format (contains @, valid domain)
- Password requirements ensure basic security (minimum 8 characters recommended)
- User IDs are automatically generated and immutable
- The displayName is shown when sharing recipes or collections with other users
- Deleting a user should cascade to remove their saved recipes, collections, and preferences(via sync)
