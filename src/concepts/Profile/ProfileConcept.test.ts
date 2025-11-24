import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import ProfileConcept from "./ProfileConcept.ts";

Deno.test("Profile Concept - Create Profile", async () => {
    const [db, client] = await testDb();
    const profileConcept = new ProfileConcept(db);
    const userId = freshID();

    try {
        // Success
        const result = await profileConcept.createProfile({
            userId,
            displayName: "Test User",
        });
        assertEquals(result, {});

        // Fail: Empty display name
        const failEmpty = await profileConcept.createProfile({
            userId: freshID(),
            displayName: "",
        });
        assertEquals((failEmpty as { error: string }).error, "Display name cannot be empty.");
    } finally {
        await client.close();
    }
});

Deno.test("Profile Concept - Update Display Name", async () => {
    const [db, client] = await testDb();
    const profileConcept = new ProfileConcept(db);
    const userId = freshID();

    try {
        await profileConcept.createProfile({
            userId,
            displayName: "Original Name",
        });

        // Success
        const update = await profileConcept.updateDisplayName({
            userId,
            displayName: "New Name",
        });
        assertEquals(update, {});

        // Verify update
        const profile = await profileConcept._getProfile(userId);
        assertEquals(profile?.displayName, "New Name");

        // Fail: Empty display name
        const failEmpty = await profileConcept.updateDisplayName({
            userId,
            displayName: "",
        });
        assertEquals((failEmpty as { error: string }).error, "Display name cannot be empty.");

        // Fail: User not found
        const failUser = await profileConcept.updateDisplayName({
            userId: freshID(),
            displayName: "New Name",
        });
        assertEquals((failUser as { error: string }).error, "Profile not found.");
    } finally {
        await client.close();
    }
});
