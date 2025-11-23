import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserConcept from "./User.ts";
import { ID } from "@utils/types.ts";

Deno.test("User Concept - Registration", async () => {
    const [db, client] = await testDb();
    const userConcept = new UserConcept(db);

    try {
        // Success
        const result = await userConcept.register({
            email: "test@example.com",
            password: "password123",
            displayName: "Test User",
        });
        assertNotEquals("error" in result, true, "Registration should succeed");
        const { userId, token } = result as { userId: ID; token: string };
        assertNotEquals(userId, undefined);
        assertNotEquals(token, undefined);

        // Fail: Duplicate email
        const failDuplicate = await userConcept.register({
            email: "test@example.com",
            password: "password123",
            displayName: "Test User 2",
        });
        assertEquals("error" in failDuplicate, true, "Should fail on duplicate email");
        assertEquals((failDuplicate as { error: string }).error, "User with this email already exists.");


        // Fail: Invalid email
        const failEmail = await userConcept.register({
            email: "invalid-email",
            password: "password123",
            displayName: "Test User",
        });
        assertEquals("error" in failEmail, true, "Should fail on invalid email");
        assertEquals((failEmail as { error: string }).error, "Invalid email format.");

        // Fail: Short password
        const failPassword = await userConcept.register({
            email: "test2@example.com",
            password: "short",
            displayName: "Test User",
        });
        assertEquals("error" in failPassword, true, "Should fail on short password");
        assertEquals((failPassword as { error: string }).error, "Password must be at least 8 characters.");
    } finally {
        await client.close();
    }
});

Deno.test("User Concept - Login and Authentication", async () => {
    const [db, client] = await testDb();
    const userConcept = new UserConcept(db);

    try {
        await userConcept.register({
            email: "login@example.com",
            password: "password123",
            displayName: "Login User",
        });

        // Login Success
        const loginResult = await userConcept.login({
            email: "login@example.com",
            password: "password123",
        });
        assertNotEquals("error" in loginResult, true, "Login should succeed");
        const { token } = loginResult as { token: string };
        assertNotEquals(token, undefined);

        // Authenticate Success
        const authResult = await userConcept.authenticate({ token });
        assertNotEquals("error" in authResult, true, "Authentication should succeed");
        const { userId } = authResult as { userId: ID };
        assertNotEquals(userId, undefined)

        // Login Fail: Wrong password
        const failPass = await userConcept.login({
            email: "login@example.com",
            password: "wrongpassword",
        });
        assertEquals("error" in failPass, true, "Should fail on wrong password");
        assertEquals((failPass as { error: string }).error, "Invalid email or password.");

        // Login Fail: Wrong email
        const failEmail = await userConcept.login({
            email: "wrong@example.com",
            password: "password123",
        });
        assertEquals("error" in failEmail, true, "Should fail on wrong email");
        assertEquals((failEmail as { error: string }).error, "Invalid email or password.");
    } finally {
        await client.close();
    }
});

Deno.test("User Concept - Profile Updates", async () => {
    const [db, client] = await testDb();
    const userConcept = new UserConcept(db);

    try {
        const reg = await userConcept.register({
            email: "update@example.com",
            password: "password123",
            displayName: "Original Name",
        });
        const userId = (reg as any).userId;

        // Update Display Name
        await userConcept.updateDisplayName({ user: userId, displayName: "New Name" });
        const [userResult] = await userConcept._getUser({ userId });
        assertNotEquals("error" in userResult, true, "Should get user successfully");
        const { user } = userResult as { user: { displayName: string } };
        assertEquals(user.displayName, "New Name");

        // Update Password
        await userConcept.updatePassword({
            user: userId,
            oldPassword: "password123",
            newPassword: "newpassword123",
        });

        // Verify new password works
        const loginNew = await userConcept.login({
            email: "update@example.com",
            password: "newpassword123",
        });
        assertNotEquals("error" in loginNew, true, "Login with new password should succeed");
        const { token: newToken } = loginNew as { token: string };
        assertNotEquals(newToken, undefined);

        // Verify old password fails
        const loginOld = await userConcept.login({
            email: "update@example.com",
            password: "password123",
        });
        assertEquals("error" in loginOld, true, "Login with old password should fail");
        assertEquals((loginOld as { error: string }).error, "Invalid email or password.");
    } finally {
        await client.close();
    }
});

Deno.test("User Concept - Deletion", async () => {
    const [db, client] = await testDb();
    const userConcept = new UserConcept(db);

    try {
        const reg = await userConcept.register({
            email: "delete@example.com",
            password: "password123",
            displayName: "Delete Me",
        });
        const { userId, token } = reg as { userId: ID; token: string };

        await userConcept.deleteUser({ user: userId });

        // Verify User gone
        const [userResult] = await userConcept._getUser({ userId });
        assertEquals("error" in userResult, true, "User should not be found");

        // Verify Session gone
        const [sessionResult] = await userConcept._getSessionUser({ token });
        assertEquals("error" in sessionResult, true, "Session should not be found");
    } finally {
        await client.close();
    }
});
