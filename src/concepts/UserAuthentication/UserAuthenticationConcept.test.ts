import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

Deno.test("UserAuthentication Concept - Create Auth", async () => {
    const [db, client] = await testDb();
    const authConcept = new UserAuthenticationConcept(db);
    const userId = freshID();

    try {
        // Success
        const result = await authConcept.createAuth({
            userId,
            email: "test@example.com",
            password: "password123",
        });
        assertEquals(result, {});

        // Fail: Duplicate email
        const failDuplicate = await authConcept.createAuth({
            userId: freshID(),
            email: "test@example.com",
            password: "password123",
        });
        assertEquals((failDuplicate as { error: string }).error, "User with this email already exists.");

        // Fail: Invalid email
        const failEmail = await authConcept.createAuth({
            userId: freshID(),
            email: "invalid-email",
            password: "password123",
        });
        assertEquals((failEmail as { error: string }).error, "Invalid email format.");

        // Fail: Short password
        const failPassword = await authConcept.createAuth({
            userId: freshID(),
            email: "test2@example.com",
            password: "short",
        });
        assertEquals((failPassword as { error: string }).error, "Password must be at least 8 characters.");
    } finally {
        await client.close();
    }
});

Deno.test("UserAuthentication Concept - Login and Session", async () => {
    const [db, client] = await testDb();
    const authConcept = new UserAuthenticationConcept(db);
    const userId = freshID();

    try {
        await authConcept.createAuth({
            userId,
            email: "login@example.com",
            password: "password123",
        });

        // Login Success
        const loginResult = await authConcept.login({
            email: "login@example.com",
            password: "password123",
        });
        assertNotEquals((loginResult as { token: string }).token, undefined);
        const token = (loginResult as { token: string }).token;

        // Authenticate Success
        const authResult = await authConcept.authenticate({ token });
        assertEquals((authResult as { userId: string }).userId, userId);

        // Logout
        await authConcept.logout({ token });
        const logoutAuth = await authConcept.authenticate({ token });
        assertEquals((logoutAuth as { error: string }).error, "Invalid session.");

        // Login Fail: Wrong password
        const failPass = await authConcept.login({
            email: "login@example.com",
            password: "wrongpassword",
        });
        assertEquals((failPass as { error: string }).error, "Invalid email or password.");
    } finally {
        await client.close();
    }
});

Deno.test("UserAuthentication Concept - Update Password", async () => {
    const [db, client] = await testDb();
    const authConcept = new UserAuthenticationConcept(db);
    const userId = freshID();

    try {
        await authConcept.createAuth({
            userId,
            email: "pw@example.com",
            password: "password123",
        });

        // Success
        const update = await authConcept.updatePassword({
            userId,
            oldPassword: "password123",
            newPassword: "newpassword123",
        });
        assertEquals(update, {});

        // Verify new password
        const loginNew = await authConcept.login({
            email: "pw@example.com",
            password: "newpassword123",
        });
        assertNotEquals((loginNew as { token: string }).token, undefined);

        // Fail: Wrong old password
        const failOld = await authConcept.updatePassword({
            userId,
            oldPassword: "wrongpassword",
            newPassword: "newerpassword123",
        });
        assertEquals((failOld as { error: string }).error, "Incorrect old password.");
    } finally {
        await client.close();
    }
});
