import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserConcept from "./User.ts";

Deno.test("User Concept - Create User", async () => {
    const [db, client] = await testDb();
    const userConcept = new UserConcept(db);

    try {
        // Success
        const result = await userConcept.createUser();
        assertNotEquals(result.userId, undefined);

        const exists = await userConcept.isUser(result.userId);
        assertEquals(exists, true);
    } finally {
        await client.close();
    }
});

Deno.test("User Concept - Delete User", async () => {
    const [db, client] = await testDb();
    const userConcept = new UserConcept(db);

    try {
        const result = await userConcept.createUser();
        const userId = result.userId;

        // Success
        await userConcept.deleteUser({ userId });

        const exists = await userConcept.isUser(userId);
        assertEquals(exists, false);

        // Fail: User not found
        const fail = await userConcept.deleteUser({ userId });
        assertEquals((fail as { error: string }).error, "User not found.");
    } finally {
        await client.close();
    }
});
