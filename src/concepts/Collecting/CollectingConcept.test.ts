import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CollectingConcept from "./CollectingConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const item1 = "item:Recipe1" as ID;
const item2 = "item:Recipe2" as ID;
const item3 = "item:Recipe3" as ID;

Deno.test("Operational Principle: Create collection, add members and items, members can access", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    // 1. Alice creates a collection
    const createResult = await collectingConcept.create({
      owner: userAlice,
      name: "Favorites",
    });
    assertNotEquals(
      "error" in createResult,
      true,
      "Collection creation should not fail.",
    );
    const { collection } = createResult as { collection: ID };
    assertExists(collection);

    // 2. Alice adds Bob as a member
    const addMemberResult = await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });
    assertEquals(
      "error" in addMemberResult,
      false,
      "Adding member should succeed.",
    );

    // 3. Alice adds an item
    const addItem1Result = await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userAlice,
    });
    assertEquals(
      "error" in addItem1Result,
      false,
      "Adding item should succeed.",
    );

    // 4. Bob (as a member) adds an item
    const addItem2Result = await collectingConcept.addItem({
      collection,
      item: item2,
      addedBy: userBob,
    });
    assertEquals(
      "error" in addItem2Result,
      false,
      "Member should be able to add items.",
    );

    // 5. Both Alice and Bob can access the collection's items
    const [aliceItemsResult] = await collectingConcept._getItems({
      collection,
      requestingUser: userAlice,
    });
    assertEquals(
      "error" in aliceItemsResult,
      false,
      "Alice should be able to view items.",
    );
    const aliceItems = (aliceItemsResult as { items: ID[] }).items;
    assertEquals(aliceItems.length, 2, "Collection should have 2 items.");
    assertEquals(aliceItems.includes(item1), true, "Should contain item1.");
    assertEquals(aliceItems.includes(item2), true, "Should contain item2.");

    const [bobItemsResult] = await collectingConcept._getItems({
      collection,
      requestingUser: userBob,
    });
    assertEquals(
      "error" in bobItemsResult,
      false,
      "Bob should be able to view items.",
    );
    const bobItems = (bobItemsResult as { items: ID[] }).items;
    assertEquals(bobItems.length, 2, "Bob should see the same 2 items.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: create initializes owner as member", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    const [membersResult] = await collectingConcept._getMembers({ collection });
    assertEquals(
      "error" in membersResult,
      false,
      "Getting members should succeed.",
    );
    const members = (membersResult as { members: ID[] }).members;
    assertEquals(members.length, 1, "Should have 1 member (the owner).");
    assertEquals(members[0], userAlice, "Owner should be a member.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addMember requires addedBy to be a member", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    // Bob is not a member, tries to add Charlie
    const result = await collectingConcept.addMember({
      collection,
      user: userCharlie,
      addedBy: userBob,
    });
    assertEquals(
      "error" in result,
      true,
      "Non-member should not be able to add members.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: addMember prevents duplicate members", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    // Try to add Alice again (she's already the owner/member)
    const result = await collectingConcept.addMember({
      collection,
      user: userAlice,
      addedBy: userAlice,
    });
    assertEquals(
      "error" in result,
      true,
      "Should not be able to add duplicate members.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeMember requires requestedBy to be owner", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });
    await collectingConcept.addMember({
      collection,
      user: userCharlie,
      addedBy: userAlice,
    });

    // Bob tries to remove Charlie (Bob is not owner)
    const result = await collectingConcept.removeMember({
      collection,
      user: userCharlie,
      requestedBy: userBob,
    });
    assertEquals(
      "error" in result,
      true,
      "Only owner should be able to remove members.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeMember prevents removing owner", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    // Alice tries to remove herself
    const result = await collectingConcept.removeMember({
      collection,
      user: userAlice,
      requestedBy: userAlice,
    });
    assertEquals(
      "error" in result,
      true,
      "Owner should not be able to be removed.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeMember successfully removes member", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });

    const removeResult = await collectingConcept.removeMember({
      collection,
      user: userBob,
      requestedBy: userAlice,
    });
    assertEquals(
      "error" in removeResult,
      false,
      "Owner should be able to remove members.",
    );

    const [membersResult] = await collectingConcept._getMembers({ collection });
    const members = (membersResult as { members: ID[] }).members;
    assertEquals(members.length, 1, "Should have 1 member after removal.");
    assertEquals(members.includes(userBob), false, "Bob should be removed.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: leave requires user to be member and not owner", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });

    // Alice (owner) tries to leave
    const ownerLeaveResult = await collectingConcept.leave({
      collection,
      user: userAlice,
    });
    assertEquals(
      "error" in ownerLeaveResult,
      true,
      "Owner should not be able to leave.",
    );

    // Charlie (non-member) tries to leave
    const nonMemberLeaveResult = await collectingConcept.leave({
      collection,
      user: userCharlie,
    });
    assertEquals(
      "error" in nonMemberLeaveResult,
      true,
      "Non-member should not be able to leave.",
    );

    // Bob (member) leaves successfully
    const bobLeaveResult = await collectingConcept.leave({
      collection,
      user: userBob,
    });
    assertEquals(
      "error" in bobLeaveResult,
      false,
      "Member should be able to leave.",
    );

    const [membersResult] = await collectingConcept._getMembers({ collection });
    const members = (membersResult as { members: ID[] }).members;
    assertEquals(members.includes(userBob), false, "Bob should have left.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: addItem requires addedBy to be member", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    // Bob (non-member) tries to add item
    const result = await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userBob,
    });
    assertEquals(
      "error" in result,
      true,
      "Non-member should not be able to add items.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: addItem prevents duplicate items", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userAlice,
    });

    // Try to add same item again
    const result = await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userAlice,
    });
    assertEquals(
      "error" in result,
      true,
      "Should not be able to add duplicate items.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeItem requires removedBy to be member", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userAlice,
    });

    // Bob (non-member) tries to remove item
    const result = await collectingConcept.removeItem({
      collection,
      item: item1,
      removedBy: userBob,
    });
    assertEquals(
      "error" in result,
      true,
      "Non-member should not be able to remove items.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeItem successfully removes item", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userAlice,
    });
    await collectingConcept.addItem({
      collection,
      item: item2,
      addedBy: userAlice,
    });

    const removeResult = await collectingConcept.removeItem({
      collection,
      item: item1,
      removedBy: userAlice,
    });
    assertEquals(
      "error" in removeResult,
      false,
      "Should be able to remove item.",
    );

    const [itemsResult] = await collectingConcept._getItems({
      collection,
      requestingUser: userAlice,
    });
    const items = (itemsResult as { items: ID[] }).items;
    assertEquals(items.length, 1, "Should have 1 item after removal.");
    assertEquals(items.includes(item1), false, "item1 should be removed.");
    assertEquals(items.includes(item2), true, "item2 should remain.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: rename requires requestedBy to be owner", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });

    // Bob tries to rename
    const result = await collectingConcept.rename({
      collection,
      newName: "Bob's Collection",
      requestedBy: userBob,
    });
    assertEquals(
      "error" in result,
      true,
      "Only owner should be able to rename.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: rename successfully changes name", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Old Name",
    })) as { collection: ID };

    const renameResult = await collectingConcept.rename({
      collection,
      newName: "New Name",
      requestedBy: userAlice,
    });
    assertEquals(
      "error" in renameResult,
      false,
      "Owner should be able to rename.",
    );

    const collections = await collectingConcept._getCollections({
      user: userAlice,
    });
    assertEquals(collections.length, 1, "Should have 1 collection.");
    assertEquals(
      collections[0].name,
      "New Name",
      "Name should be updated.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete requires requestedBy to be owner", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });

    // Bob tries to delete
    const result = await collectingConcept.delete({
      collection,
      requestedBy: userBob,
    });
    assertEquals(
      "error" in result,
      true,
      "Only owner should be able to delete.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete successfully removes collection", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    const deleteResult = await collectingConcept.delete({
      collection,
      requestedBy: userAlice,
    });
    assertEquals(
      "error" in deleteResult,
      false,
      "Owner should be able to delete.",
    );

    const collections = await collectingConcept._getCollections({
      user: userAlice,
    });
    assertEquals(
      collections.length,
      0,
      "Should have no collections after deletion.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("System Action: removeItemSystemwide removes item from all collections", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    // Create two collections
    const { collection: collection1 } = (await collectingConcept.create({
      owner: userAlice,
      name: "Collection 1",
    })) as { collection: ID };

    const { collection: collection2 } = (await collectingConcept.create({
      owner: userBob,
      name: "Collection 2",
    })) as { collection: ID };

    // Add same item to both collections
    await collectingConcept.addItem({
      collection: collection1,
      item: item1,
      addedBy: userAlice,
    });
    await collectingConcept.addItem({
      collection: collection2,
      item: item1,
      addedBy: userBob,
    });

    // Remove item system-wide
    await collectingConcept.removeItemSystemwide({ item: item1 });

    // Verify item is removed from both collections
    const [items1Result] = await collectingConcept._getItems({
      collection: collection1,
      requestingUser: userAlice,
    });
    const items1 = (items1Result as { items: ID[] }).items;
    assertEquals(
      items1.includes(item1),
      false,
      "item1 should be removed from collection1.",
    );

    const [items2Result] = await collectingConcept._getItems({
      collection: collection2,
      requestingUser: userBob,
    });
    const items2 = (items2Result as { items: ID[] }).items;
    assertEquals(
      items2.includes(item1),
      false,
      "item1 should be removed from collection2.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getItems requires requestingUser to be member", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Test Collection",
    })) as { collection: ID };

    await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userAlice,
    });

    // Bob (non-member) tries to get items
    const [result] = await collectingConcept._getItems({
      collection,
      requestingUser: userBob,
    });
    
    assertEquals(
      "error" in result,
      true,
      "Non-member should not be able to view items.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getCollections returns all user's collections", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    // Alice creates two collections
    await collectingConcept.create({
      owner: userAlice,
      name: "Collection 1",
    });
    await collectingConcept.create({
      owner: userAlice,
      name: "Collection 2",
    });

    // Bob creates one and adds Alice
    const { collection: bobCollection } = (await collectingConcept.create({
      owner: userBob,
      name: "Bob's Collection",
    })) as { collection: ID };
    await collectingConcept.addMember({
      collection: bobCollection,
      user: userAlice,
      addedBy: userBob,
    });

    // Alice should see all 3 collections
    const aliceCollections = await collectingConcept._getCollections({
      user: userAlice,
    });
    assertEquals(
      aliceCollections.length,
      3,
      "Alice should be in 3 collections.",
    );

    // Bob should see only his collection
    const bobCollections = await collectingConcept._getCollections({
      user: userBob,
    });
    assertEquals(bobCollections.length, 1, "Bob should be in 1 collection.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getCollectionsWithItemStatus shows correct item status", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    // Create two collections for Alice
    const { collection: collection1 } = (await collectingConcept.create({
      owner: userAlice,
      name: "Collection 1",
    })) as { collection: ID };

    const { collection: collection2 } = (await collectingConcept.create({
      owner: userAlice,
      name: "Collection 2",
    })) as { collection: ID };

    // Add item1 only to collection1
    await collectingConcept.addItem({
      collection: collection1,
      item: item1,
      addedBy: userAlice,
    });

    // Get status for item1
    const statusResult = await collectingConcept._getCollectionsWithItemStatus(
      {
        user: userAlice,
        item: item1,
      },
    );

    assertEquals(
      statusResult.length,
      2,
      "Should return status for 2 collections.",
    );

    const collection1Status = statusResult.find((s) =>
      s.collection._id === collection1
    );
    const collection2Status = statusResult.find((s) =>
      s.collection._id === collection2
    );

    assertEquals(
      collection1Status?.hasItem,
      true,
      "collection1 should have item1.",
    );
    assertEquals(
      collection2Status?.hasItem,
      false,
      "collection2 should not have item1.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Interesting scenario: Items remain when member leaves", async () => {
  const [db, client] = await testDb();
  const collectingConcept = new CollectingConcept(db);

  try {
    const { collection } = (await collectingConcept.create({
      owner: userAlice,
      name: "Shared Collection",
    })) as { collection: ID };

    // Add Bob and he adds an item
    await collectingConcept.addMember({
      collection,
      user: userBob,
      addedBy: userAlice,
    });
    await collectingConcept.addItem({
      collection,
      item: item1,
      addedBy: userBob,
    });

    // Bob leaves
    await collectingConcept.leave({
      collection,
      user: userBob,
    });

    // Alice should still see the item Bob added
    const [itemsResult] = await collectingConcept._getItems({
      collection,
      requestingUser: userAlice,
    });
    const items = (itemsResult as { items: ID[] }).items;
    assertEquals(
      items.includes(item1),
      true,
      "Items added by Bob should remain after he leaves.",
    );
  } finally {
    await client.close();
  }
});