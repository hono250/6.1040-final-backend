# Concept: UserAuthentication

## Purpose
Manage user authentication, credentials, and sessions.

## Principle
Users authenticate with an email and password. Successful authentication creates a session token. Sessions persist until logout or expiration.

## State
    a set of Auths with
      a userId User
      an email String
      a passwordHash String       # Hashed password for security

    a set of Sessions with
      a user User
      a token String
      a createdAt DateTime
      an expiresAt DateTime       # Valid for 30 days

## Actions

`createAuth (userId: User, email: String, password: String)`
- **Requires**: 
  - No Auth exists with email
  - Email is valid format
  - Password meets minimum requirements (e.g., 8+ characters)
- **Effect**: Creates new Auth with email and hashed password

`login (email: String, password: String): (token: String)`
- **Requires**: 
  - Auth exists with email
  - Password matches stored passwordHash
- **Effect**: Creates Session with fresh random token, sets createdAt to current time, sets expiresAt to 30 days from now, returns token

`logout (token: String)`
- **Requires**: Session exists with token
- **Effect**: Removes Session

`authenticate (token: String): (userId: User)`
- **Requires**: 
  - Session exists with token
  - Session.expiresAt > current time
- **Effect**: Updates session.expiresAt to 30 days from now (refreshes session), returns session.user

`updatePassword (userId: User, oldPassword: String, newPassword: String)`
- **Requires**:
  - Auth exists for user
  - oldPassword matches stored passwordHash
  - newPassword meets minimum requirements
- **Effect**: Updates passwordHash with new hashed password

`deleteAuth (userId: User)`
- **Requires**: Auth exists for user
- **Effect**: Removes all Sessions for user, removes Auth

`getByEmail (email: String): (auth: Auth)`
- **Effect**: Returns auth if exists, or null if not found

`getSessionUser (token: String): (userId: User)`
- **Effect**: Returns userId if session exists and is valid, or null if not found
