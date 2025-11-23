import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserConcept from "./User.ts";

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
        assertNotEquals((result as any).userId, undefined);
        assertNotEquals((result as any).token, undefined);

        // Fail: Duplicate email
        const failDuplicate = await userConcept.register({
            email: "test@example.com",
            password: "password123",
            displayName: "Test User 2",
        });
        assertEquals((failDuplicate as any).error, "User with this email already exists.");

        // Fail: Invalid email
        const failEmail = await userConcept.register({
            email: "invalid-email",
            password: "password123",
            displayName: "Test User",
        });
        assertEquals((failEmail as any).error, "Invalid email format.");

        // Fail: Short password
        const failPassword = await userConcept.register({
            email: "test2@example.com",
            password: "short",
            displayName: "Test User",
        });
        assertEquals((failPassword as any).error, "Password must be at least 8 characters.");
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
        assertNotEquals((loginResult as any).token, undefined);
        const token = (loginResult as any).token;

        // Authenticate Success
        const authResult = await userConcept.authenticate({ token });
        assertNotEquals((authResult as any).userId, undefined);

        // Login Fail: Wrong password
        const failPass = await userConcept.login({
            email: "login@example.com",
            password: "wrongpassword",
        });
        assertEquals((failPass as any).error, "Invalid email or password.");

        // Login Fail: Wrong email
        const failEmail = await userConcept.login({
            email: "wrong@example.com",
            password: "password123",
        });
        assertEquals((failEmail as any).error, "Invalid email or password.");
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
        const user = await userConcept._getUser({ userId });
        assertEquals(user?.displayName, "New Name");

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
        assertNotEquals((loginNew as any).token, undefined);

        // Verify old password fails
        const loginOld = await userConcept.login({
            email: "update@example.com",
            password: "password123",
        });
        assertEquals((loginOld as any).error, "Invalid email or password.");
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
        const userId = (reg as any).userId;
        const token = (reg as any).token;

        await userConcept.deleteUser({ user: userId });

        // Verify User gone
        const user = await userConcept._getUser({ userId });
        assertEquals(user, null);

        // Verify Session gone
        const sessionUser = await userConcept._getSessionUser({ token });
        assertEquals(sessionUser, null);
    } finally {
        await client.close();
    }
});
