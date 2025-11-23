import {
    assertArrayIncludes,
    assertEquals,
    assertExists,
    assertNotEquals,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

import RecipeConcept from "./RecipeConcept.ts";

Deno.test("Principle: a user adds a recipe with the name of the dish, the ingredients needed, and the list of instructions or link to the recipe; this recipe can then be viewed by the user, and possibly other users; the user can also search for recipes with ingredients", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);

    const aliceUser: ID = "user_alice";

    let recipeId: ID;
    let spaghettiId: ID;
    let pancettaId: ID;
    let eggsId: ID;

    await t.step("1. add recipe with name and description", async () => {
        const recipeData = {
            owner: aliceUser,
            title: "Spaghetti Carbonara",
            description: "1. Boil pasta. 2. Fry pancetta. 3. Mix eggs and cheese. Combine off heat."
        };

        const createResult = await concept.createRecipe(recipeData);

        if ("error" in createResult) throw new Error(createResult.error);
        assertExists(createResult.recipe, "Recipe ID should exist");

        // Assign to outer variable so Step 2 can see it
        recipeId = createResult.recipe;
    });

    await t.step("2. create and add ingredients to recipe", async () => {
        // 2a. Create the Ingredients in the global collection
        const r1 = await concept.createIngredient({ name: "Spaghetti", quantity: 400, unit: "g" });
        const r2 = await concept.createIngredient({ name: "Pancetta", quantity: 150, unit: "g" });
        const r3 = await concept.createIngredient({ name: "Eggs", quantity: 3, unit: "large" });

        if ("error" in r1) throw new Error(r1.error);
        if ("error" in r2) throw new Error(r2.error);
        if ("error" in r3) throw new Error(r3.error);

        spaghettiId = r1.ingredient._id;
        pancettaId = r2.ingredient._id;
        eggsId = r3.ingredient._id;

        // 2b. Add them to the Recipe
        await concept.addIngredientToRecipe({
            requestedBy: aliceUser,
            recipe: recipeId,
            ingredient: spaghettiId
        });
        await concept.addIngredientToRecipe({
            requestedBy: aliceUser,
            recipe: recipeId,
            ingredient: pancettaId
        });
        await concept.addIngredientToRecipe({
            requestedBy: aliceUser,
            recipe: recipeId,
            ingredient: eggsId
        });
    });

    await t.step("3. view the recipe", async () => {
        const result = await concept._getRecipe({ owner: aliceUser, title: "Spaghetti Carbonara" });

        if ("error" in result) throw new Error(result.error);

        const recipe = result.recipes[0];

        // Assertions
        assertEquals(recipe._id, recipeId);
        assertEquals(recipe.description, "1. Boil pasta. 2. Fry pancetta. 3. Mix eggs and cheese. Combine off heat.");
        assertEquals(recipe.ingredients.length, 3);

        // Verify ingredient names are present (using lowercase as per your implementation)
        const ingredientNames = recipe.ingredients.map(i => i.name);
        assertArrayIncludes(ingredientNames, ["spaghetti", "pancetta", "eggs"]);
    });

    await t.step("4. search for recipes with ingredients", async () => {
        // Search by one ingredient
        const searchResult = await concept._findRecipeByIngredient({ ingredients: ["Spaghetti"] });

        if ("error" in searchResult) throw new Error(searchResult.error);
        assertArrayIncludes(searchResult.recipes, [recipeId], "Should find recipe via Spaghetti");

        // Search by multiple ingredients
        const multiSearchResult = await concept._findRecipeByIngredient({ ingredients: ["Pancetta", "Eggs"] });

        if ("error" in multiSearchResult) throw new Error(multiSearchResult.error);
        assertArrayIncludes(multiSearchResult.recipes, [recipeId], "Should find recipe via Pancetta and Eggs");
    });

    await client.close();
});


Deno.test("Actions: createRecipe, deleteRecipe", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const user: ID = "user_test_creates";
    let recipeToDelete: ID;
    let recipeToKeep: ID;

    await t.step("1. Success: Create recipe with Description ONLY", async () => {
        const result = await concept.createRecipe({
            owner: user,
            title: "Grandma's Secret Sauce",
            description: "Mix tomato and basil. Cook for 4 hours."
        });

        if ("error" in result) throw new Error(result.error);

        assertExists(result.recipe);
        recipeToDelete = result.recipe;

        // Verification: Check that link is empty string (default) and description is set
        const fetched = await concept._getRecipe({ owner: user, title: "Grandma's Secret Sauce" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].description, "Mix tomato and basil. Cook for 4 hours.");
        assertEquals(fetched.recipes[0].link, "");
    });

    await t.step("2. Success: Create recipe with Link ONLY", async () => {
        const result = await concept.createRecipe({
            owner: user,
            title: "Yakult Matcha",
            link: "https://www.instagram.com/p/DQ7_kWPE2HN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=="
        });

        if ("error" in result) throw new Error(result.error);

        assertExists(result.recipe);
        recipeToKeep = result.recipe;

        // Verification: Check that description is empty string (default) and link is set
        const fetched = await concept._getRecipe({ owner: user, title: "Yakult Matcha" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].link, "https://www.instagram.com/p/DQ7_kWPE2HN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==");
        assertEquals(fetched.recipes[0].description, "");
    });

    await t.step("3. Failure: Create recipe with NEITHER link nor description", async () => {
        const result = await concept.createRecipe({
            owner: user,
            title: "Mystery Dish",
            // Both are undefined
        });

        // We expect an error here
        if (!("error" in result)) throw new Error("Should have failed but succeeded");

        assertEquals(result.error, "Recipe must have at least a link or description!");
    });

    await t.step("4. Success: Create recipe with BOTH link and description", async () => {
        const result = await concept.createRecipe({
            owner: user,
            title: "Ultimate Guide to Toast",
            link: "https://www.youtube.com/watch?v=cglfUwNCLPI",
            description: "1. Put bread in toaster. 2. Push lever down."
        });

        if ("error" in result) throw new Error(result.error);

        assertExists(result.recipe);

        // Verification
        const fetched = await concept._getRecipe({ owner: user, title: "Ultimate Guide to Toast" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].link, "https://www.youtube.com/watch?v=cglfUwNCLPI");
        assertEquals(fetched.recipes[0].description, "1. Put bread in toaster. 2. Push lever down.");
    });

    await t.step("5. Success: Delete recipe with the right user", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: user,
            recipe: recipeToDelete
        });

        if ("error" in result) throw new Error(result.error);

        // Verification: Try to fetch it, expecting an error or empty result
        const fetched = await concept._getRecipe({ owner: user, title: "Grandma's Secret Sauce" });

        // Based on your implementation, _getRecipe returns an error if not found
        if (!("error" in fetched)) {
            throw new Error("Recipe should have been deleted but was found");
        }
    });

    await t.step("6. Failure: Delete recipe with wrong user", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: "imposter" as ID,
            recipe: recipeToKeep
        });

        if (!("error" in result)) throw new Error("Should have failed to delete someone else's recipe");
        assertEquals(result.error, "Sorry, you are not the owner of this recipe. You cannot delete the recipe.");
    })

    await t.step("7. Failure: Delete recipe that doesn't exist", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: user,
            recipe: "randomRecipeIdThatShouldntExist" as ID
        });


        if (!("error" in result)) throw new Error("Should have failed to delete non-existent recipe");
        // Note: Implementation returns "Recipe not found" before checking ownership
        assertEquals(result.error, "Recipe not found");
    });
    await client.close();
});

Deno.test("Actions: Modify Link/Description (Constraints & Transitions)", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const user = "user_mod" as ID;
    const imposter = "user_imposter" as ID;

    let recipeId: ID;

    await t.step("0. Setup: Create recipe with Description ONLY", async () => {
        const result = await concept.createRecipe({
            owner: user,
            title: "Modifiable Recipe",
            description: "Original Description"
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.recipe);
        recipeId = result.recipe;
    });

    await t.step("1. Success: setLink (transition to Both)", async () => {
        const result = await concept.setLink({
            requestedBy: user,
            recipe: recipeId,
            link: "https://example.com/food"
        });
        if ("error" in result) throw new Error(result.error);

        const fetched = await concept._getRecipe({ owner: user, title: "Modifiable Recipe" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].link, "https://example.com/food");
        assertEquals(fetched.recipes[0].description, "Original Description");
    });

    await t.step("2. Failure: Invalid Link Format", async () => {
        const result = await concept.setLink({
            requestedBy: user,
            recipe: recipeId,
            link: "not_a_url"
        });
        if (!("error" in result)) throw new Error("Should fail invalid link");
        assertEquals(result.error, "Invalid link format!");
    });

    await t.step("3. Success: removeDescription (transition to Link Only)", async () => {
        const result = await concept.removeDescription({
            requestedBy: user,
            recipe: recipeId
        });
        if ("error" in result) throw new Error(result.error);

        const fetched = await concept._getRecipe({ owner: user, title: "Modifiable Recipe" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].description, "");
        assertEquals(fetched.recipes[0].link, "https://example.com/food");
    });

    await t.step("4. Failure: removeLink when Description is missing", async () => {
        // Cannot remove the link if it is the only thing left
        const result = await concept.removeLink({
            requestedBy: user,
            recipe: recipeId
        });
        if (!("error" in result)) throw new Error("Should fail removing last content");
        assertEquals(result.error, "Cannot remove link because the recipe has no description.");
    });

    await t.step("5. Success: setDescription (transition to Both)", async () => {
        const result = await concept.setDescription({
            requestedBy: user,
            recipe: recipeId,
            description: "New Description"
        });
        if ("error" in result) throw new Error(result.error);

        const fetched = await concept._getRecipe({ owner: user, title: "Modifiable Recipe" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].description, "New Description");
    });

    await t.step("6. Success: removeLink (transition to Description Only)", async () => {
        const result = await concept.removeLink({
            requestedBy: user,
            recipe: recipeId
        });
        if ("error" in result) throw new Error(result.error);

        const fetched = await concept._getRecipe({ owner: user, title: "Modifiable Recipe" });
        if ("error" in fetched) throw new Error(fetched.error);

        // Link should be empty string or removed
        assertEquals(fetched.recipes[0].link, "");
        assertEquals(fetched.recipes[0].description, "New Description");
    });

    await t.step("7. Failure: removeDescription when Link is missing", async () => {
        // Cannot remove description if it is the only thing left
        const result = await concept.removeDescription({
            requestedBy: user,
            recipe: recipeId
        });
        if (!("error" in result)) throw new Error("Should fail removing last content");
        assertEquals(result.error, "Cannot remove description because the recipe has no link.");
    });

    await t.step("8. Failure: Ownership checks", async () => {
        const result = await concept.setDescription({
            requestedBy: imposter,
            recipe: recipeId,
            description: "Hacked"
        });

        if (!("error" in result)) throw new Error("Imposter should fail");

        // Note: Your checkRecipeAndOwner implementation currently returns this specific error message
        // for ALL failures, including modifications, not just deletes.
        assertEquals(result.error, "Sorry, you are not the owner of this recipe. You cannot delete the recipe.");
    });

    await client.close();
});


Deno.test("Actions: Copying (setRecipeCopy & copyRecipe)", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const userA = "user_original" as ID;
    const userB = "user_copier" as ID;

    let originalRecipeId: ID;
    let copiedRecipeId: ID;

    await t.step("0. Setup: Create a rich recipe for User A", async () => {
        // Create recipe
        const createRes = await concept.createRecipe({
            owner: userA,
            title: "Original Lasagna",
            description: "Layer pasta and sauce.",
            link: "http://lasagna.com"
        });
        if ("error" in createRes) throw new Error(createRes.error);
        originalRecipeId = createRes.recipe;

        // Add an ingredient to verify ingredients are copied
        const ingRes = await concept.createIngredient({ name: "Cheese", quantity: 500, unit: "g" });
        if ("error" in ingRes) throw new Error(ingRes.error);

        await concept.addIngredientToRecipe({
            requestedBy: userA,
            recipe: originalRecipeId,
            ingredient: ingRes.ingredient._id
        });
    });

    await t.step("1. Success: setRecipeCopy (toggle manually)", async () => {
        const res1 = await concept.setRecipeCopy({ requestedBy: userA, recipe: originalRecipeId, isCopy: true });
        if ("error" in res1) throw new Error(res1.error);

        const fetch1 = await concept._getRecipe({ owner: userA, title: "Original Lasagna" });
        if ("error" in fetch1) throw new Error(fetch1.error);
        assertEquals(fetch1.recipes[0].isCopy, true);

        const res2 = await concept.setRecipeCopy({ requestedBy: userA, recipe: originalRecipeId, isCopy: false });
        if ("error" in res2) throw new Error(res2.error);

        const fetch2 = await concept._getRecipe({ owner: userA, title: "Original Lasagna" });
        if ("error" in fetch2) throw new Error(fetch2.error);
        assertEquals(fetch2.recipes[0].isCopy, false);
    });

    await t.step("2. Failure: setRecipeCopy (Imposter)", async () => {
        const res = await concept.setRecipeCopy({ requestedBy: userB, recipe: originalRecipeId, isCopy: true });

        if (!("error" in res)) throw new Error("Imposter shouldn't be able to set copy flag");
        assertEquals(res.error, "Sorry, you are not the owner of this recipe. You cannot delete the recipe.");
    });

    await t.step("3. Success: copyRecipe (User B copies User A)", async () => {
        // Action: User B copies User A's recipe
        const res = await concept.copyRecipe({ requestedBy: userB, recipe: originalRecipeId });
        if ("error" in res) throw new Error(res.error);
        assertExists(res.recipe);
        copiedRecipeId = res.recipe;

        // Verify the New/Copied Recipe (User B)
        const fetchCopy = await concept._getRecipe({ owner: userB, title: "Original Lasagna" });
        if ("error" in fetchCopy) throw new Error(fetchCopy.error);
        const copy = fetchCopy.recipes[0];

        assertEquals(copy.owner, userB);
        assertEquals(copy.description, "Layer pasta and sauce.");
        assertEquals(copy.link, "http://lasagna.com");
        assertEquals(copy.isCopy, true); // New recipe is marked as copy
        assertEquals(copy.ingredients.length, 1);
        assertEquals(copy.ingredients[0].name, "cheese"); // normalized in createIngredient

        const fetchOriginal = await concept._getRecipe({ owner: userA, title: "Original Lasagna" });
        if ("error" in fetchOriginal) throw new Error(fetchOriginal.error);
        assertEquals(fetchOriginal.recipes[0].isCopy, true);
    });

    await t.step("4. Failure: copyRecipe (Non-existent)", async () => {
        const res = await concept.copyRecipe({
            requestedBy: userB,
            recipe: "fake_id" as ID
        });
        if (!("error" in res)) throw new Error("Should fail to copy non-existent recipe");
        assertEquals(res.error, "Recipe not found");
    });

    await client.close();
});


Deno.test("Actions: Image Handling (setImage & deleteImage)", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const user = "user_img_owner" as ID;
    const imposter = "user_img_imposter" as ID;

    let recipeId: ID;

    await t.step("0. Setup: Create Recipe", async () => {
        const res = await concept.createRecipe({
            owner: user,
            title: "Photogenic Cake",
            description: "A cake that looks great in photos."
        });
        if ("error" in res) throw new Error(res.error);
        recipeId = res.recipe;
    });

    await t.step("1. Success: setImage", async () => {
        const res = await concept.setImage({
            requestedBy: user,
            recipe: recipeId,
            image: "https://example.com/cake.jpg"
        });
        if ("error" in res) throw new Error(res.error);

        const fetched = await concept._getRecipe({ owner: user, title: "Photogenic Cake" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].image, "https://example.com/cake.jpg");
    });

    await t.step("2. Failure: setImage as the wrong user", async () => {
        const res = await concept.setImage({
            requestedBy: imposter,
            recipe: recipeId,
            image: "https://example.com/hacked.jpg"
        });
        if (!("error" in res)) throw new Error("Imposter should fail");
        assertEquals(res.error, "Sorry, you are not the owner of this recipe. You cannot delete the recipe.");
    });

    await t.step("3. Failure: deleteImage as the wrong user", async () => {
        const res = await concept.deleteImage({
            requestedBy: imposter,
            recipe: recipeId
        });
        if (!("error" in res)) throw new Error("Imposter should fail");
        assertEquals(res.error, "Sorry, you are not the owner of this recipe. You cannot delete the recipe.");
    });

    await t.step("4. Success: deleteImage", async () => {
        const res = await concept.deleteImage({
            requestedBy: user,
            recipe: recipeId
        });
        if ("error" in res) throw new Error(res.error);

        const fetched = await concept._getRecipe({ owner: user, title: "Photogenic Cake" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].image, "");
    });

    await t.step("5. Success: deleteImage (Idempotent check)", async () => {
        const res = await concept.deleteImage({
            requestedBy: user,
            recipe: recipeId
        });
        if ("error" in res) throw new Error(res.error);
    });

    await client.close();
});

Deno.test("Queries: Search, Filter, and Scaling", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const userA: ID = "user_chef_A";
    const userB: ID = "user_chef_B";

    // Store IDs for assertions
    let carbId: ID, tomatoId: ID, breakfastId: ID;
    let spaghettiId: ID, eggsId: ID;

    await t.step("0. Setup: Create Data Population", async () => {
        // 1. Create Ingredients
        const makeIng = async (n: string, q: number, u: string) => {
            const res = await concept.createIngredient({ name: n, quantity: q, unit: u });
            if ("error" in res) throw new Error(res.error);
            return res.ingredient._id;
        };

        spaghettiId = await makeIng("Spaghetti", 500, "g");
        eggsId = await makeIng("Eggs", 12, "whole");
        const pancettaId = await makeIng("Pancetta", 200, "g");
        const tomatoId_ing = await makeIng("Tomato", 3, "whole");
        const baconId = await makeIng("Bacon", 5, "slices");

        // 2. Create Recipes
        const makeRecipe = async (owner: ID, title: string, ings: ID[]) => {
            const res = await concept.createRecipe({ owner, title, description: "desc" });
            if ("error" in res) throw new Error(res.error);
            const rid = res.recipe;
            for (const iid of ings) {
                await concept.addIngredientToRecipe({ requestedBy: owner, recipe: rid, ingredient: iid });
            }
            return rid;
        };

        // User A: Spaghetti Carbonara (Spaghetti, Eggs, Pancetta)
        carbId = await makeRecipe(userA, "Spaghetti Carbonara", [spaghettiId, eggsId, pancettaId]);

        // User A: Tomato Basil Spaghetti (Spaghetti, Tomato)
        tomatoId = await makeRecipe(userA, "Tomato Basil Spaghetti", [spaghettiId, tomatoId_ing]);

        // User B: American Breakfast (Eggs, Bacon)
        breakfastId = await makeRecipe(userB, "American Breakfast", [eggsId, baconId]);
    });

    await t.step("1. _getAllRecipes (by Owner)", async () => {
        const resA = await concept._getAllRecipes({ owner: userA });
        if ("error" in resA) throw new Error(resA.error);
        assertEquals(resA.recipes.length, 2); // Carbonara + Tomato

        const resB = await concept._getAllRecipes({ owner: userB });
        if ("error" in resB) throw new Error(resB.error);
        assertEquals(resB.recipes.length, 1); // Breakfast
    });

    await t.step("2. _getIngredients & _getIngredientsByName", async () => {
        // Get All
        const all = await concept._getIngredients({});
        if ("error" in all) throw new Error(all.error);
        // We created 5 unique ingredients
        assertEquals(all.ingredients.length, 5);

        // Get By Name (Regex search)
        const search = await concept._getIngredientsByName({ name: "Spag" });
        if ("error" in search) throw new Error(search.error);
        assertEquals(search.ingredients.length, 1);
        assertEquals(search.ingredients[0].name, "spaghetti");
    });

    await t.step("3. _search (Title Regex)", async () => {
        // Search "Spaghetti" -> Should find Carbonara and Tomato Spaghetti
        const res = await concept._search({ query: "Spaghetti" });
        if ("error" in res) throw new Error(res.error);

        assertEquals(res.recipes.length, 2);
        assertArrayIncludes(res.recipes, [carbId, tomatoId]);
    });

    await t.step("4. _findRecipeByIngredient", async () => {
        // Search "Eggs" -> Should find Carbonara and Breakfast
        const res = await concept._findRecipeByIngredient({ ingredients: ["Eggs"] });
        if ("error" in res) throw new Error(res.error);

        assertEquals(res.recipes.length, 2);
        assertArrayIncludes(res.recipes, [carbId, breakfastId]);

        // Search "Tomato" -> Should find only Tomato Spaghetti
        const res2 = await concept._findRecipeByIngredient({ ingredients: ["Tomato"] });
        if ("error" in res2) throw new Error(res2.error);
        assertEquals(res2.recipes.length, 1);
        assertEquals(res2.recipes[0], tomatoId);
    });

    await t.step("5. _searchWithinRecipes (Subset Constraint)", async () => {
        // We have a list of ONLY User A's recipes
        const userASet = [carbId, tomatoId];

        // Search for "Spaghetti" inside User A's set -> Should get both
        const res1 = await concept._searchWithinRecipes({ query: "Spaghetti", recipes: userASet });
        if ("error" in res1) throw new Error(res1.error);
        assertEquals(res1.recipes.length, 2);

        // Search for "Breakfast" inside User A's set -> Should get 0, even though "Breakfast" exists in DB
        const res2 = await concept._searchWithinRecipes({ query: "Breakfast", recipes: userASet });
        if ("error" in res2) throw new Error(res2.error);
        assertEquals(res2.recipes.length, 0);
    });

    await t.step("6. _findRecipeByIngredientWithinRecipes", async () => {
        // Constrain to only User A's recipes
        const userASet = [carbId, tomatoId];

        // Search for "Eggs" within User A's set
        // "Eggs" are in Carbonara (User A) AND Breakfast (User B).
        // Result should ONLY be Carbonara.
        const res = await concept._findRecipeByIngredientWithinRecipes({
            ingredients: ["Eggs"],
            recipes: userASet
        });

        if ("error" in res) throw new Error(res.error);
        assertEquals(res.recipes.length, 1);
        assertEquals(res.recipes[0], carbId);
    });

    await t.step("7. _filterIngredientAndSearch (Title AND Ingredient)", async () => {
        // Query: Title contains "Spaghetti" AND has ingredient "Eggs"
        // Candidates:
        // - Carbonara: Title "Spaghetti" (Match), has Eggs (Match) -> KEEP
        // - Tomato Spaghetti: Title "Spaghetti" (Match), has Eggs (No) -> DISCARD
        // - Breakfast: Title "Spaghetti" (No) -> DISCARD

        const res = await concept._filterIngredientAndSearch({
            query: "Spaghetti",
            ingredients: ["Eggs"]
        });

        if ("error" in res) throw new Error(res.error);
        assertEquals(res.recipes.length, 1);
        assertEquals(res.recipes[0], carbId);
    });

    await t.step("8. _filterIngredientAndSearchWithinRecipes", async () => {
        // Constrain to User B's recipes [Breakfast]
        // Search Title "Breakfast" AND Ingredient "Bacon"
        const res = await concept._filterIngredientAndSearchWithinRecipes({
            recipes: [breakfastId],
            query: "Breakfast",
            ingredients: ["Bacon"]
        });

        if ("error" in res) throw new Error(res.error);
        assertEquals(res.recipes.length, 1);
        assertEquals(res.recipes[0], breakfastId);

        // Fail Case: Search Title "Breakfast" AND Ingredient "Spaghetti"
        const resFail = await concept._filterIngredientAndSearchWithinRecipes({
            recipes: [breakfastId],
            query: "Breakfast",
            ingredients: ["Spaghetti"]
        });
        if ("error" in resFail) throw new Error(resFail.error);
        assertEquals(resFail.recipes.length, 0);
    });

    await client.close();
});


Deno.test("Queries: Scaling Edge Cases", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const user: ID = "user_baker";
    let recipeId: ID;

    await t.step("0. Setup: Create Base Recipe", async () => {
        // Create Recipe
        const r = await concept.createRecipe({
            owner: user,
            title: "Scaling Test Cake",
            description: "A cake to be scaled."
        });
        if ("error" in r) throw new Error(r.error);
        recipeId = r.recipe;

        // Create Ingredients
        const i1 = await concept.createIngredient({ name: "Flour", quantity: 100, unit: "g" });
        const i2 = await concept.createIngredient({ name: "Sugar", quantity: 50, unit: "g" });
        if ("error" in i1 || "error" in i2) throw new Error("Failed to create ingredients");

        // Add to Recipe
        await concept.addIngredientToRecipe({ requestedBy: user, recipe: recipeId, ingredient: i1.ingredient._id });
        await concept.addIngredientToRecipe({ requestedBy: user, recipe: recipeId, ingredient: i2.ingredient._id });
    });

    await t.step("1. Success: Scale by Integer (x2)", async () => {
        const result = await concept._scaleIngredients({
            recipe: recipeId,
            scaleFactor: 2
        });

        if ("error" in result) throw new Error(result.error);

        const flour = result.ingredients.find(i => i.name === "flour");
        const sugar = result.ingredients.find(i => i.name === "sugar");

        assertExists(flour);
        assertExists(sugar);
        assertEquals(flour.quantity, 200); // 100 * 2
        assertEquals(sugar.quantity, 100); // 50 * 2
    });

    await t.step("2. Success: Scale by Decimal (x0.5)", async () => {
        const result = await concept._scaleIngredients({
            recipe: recipeId,
            scaleFactor: 0.5
        });

        if ("error" in result) throw new Error(result.error);

        const flour = result.ingredients.find(i => i.name === "flour");
        const sugar = result.ingredients.find(i => i.name === "sugar");

        assertEquals(flour?.quantity, 50); // 100 * 0.5
        assertEquals(sugar?.quantity, 25); // 50 * 0.5
    });

    await t.step("3. Failure: Scale by Negative (-1)", async () => {
        const result = await concept._scaleIngredients({
            recipe: recipeId,
            scaleFactor: -1
        });

        // We expect an error here based on the requirement "scale must be positive"
        if (!("error" in result)) {
            throw new Error("Should have failed to scale by negative number");
        }
        // Assuming your implementation returns this or similar error
        // assertEquals(result.error, "Scale factor must be positive.");
    });

    await t.step("4. Failure: Scale by Zero (0)", async () => {
        const result = await concept._scaleIngredients({
            recipe: recipeId,
            scaleFactor: 0
        });

        // We expect an error here because 0 is not positive
        if (!("error" in result)) {
            throw new Error("Should have failed to scale by zero");
        }
    });

    await client.close();
});
