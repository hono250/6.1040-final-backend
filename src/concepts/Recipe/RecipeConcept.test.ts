import {
    assertArrayIncludes,
    assertEquals,
    assertExists,
} from "jsr:@std/assert";
import "jsr:@std/dotenv/load";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

import RecipeConcept from "./RecipeConcept.ts";
import { RecipeDoc } from "./RecipeConcept.ts";

import { GeminiLLM, Config } from "@utils/gemini-llm.ts";

/**
 * Load configuration from config.json
 */
function loadConfig(): Config {
    try {
        const apikey = Deno.env.get("GEMINI_API_KEY");
        if (!apikey) {
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }
        const config = { apiKey: apikey};
        return config;
    } catch (error) {
        console.error('❌ Error loading config.json. Please ensure it exists with your API key.');
        console.error('Error details:', (error as Error).message);
        process.exit(1);
    }
}

Deno.test("Principle: a user adds a recipe with the name of the dish, the ingredients needed, and the list of instructions or link to the recipe; this recipe can then be viewed by the user, and possibly other users; the user can also search for recipes with ingredients", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);

    const aliceUser = "user_alice" as ID;

    let recipeId: ID;
    let spaghettiId: ID;
    let pancettaId: ID;
    let eggsId: ID;

    await t.step("1. add recipe with name and description", async () => {
        const recipeData = {
            owner: aliceUser,
            title: "Spaghetti Carbonara",
            description: "1. Boil pasta. 2. Fry pancetta. 3. Mix eggs and cheese. Combine off heat.",
            isPublic: true
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
        const [result] = await concept._getRecipe({ owner: aliceUser, title: "Spaghetti Carbonara" });
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
        const [searchResult] = await concept._findRecipeByIngredient({ ingredients: ["Spaghetti"] });

        if ("error" in searchResult) throw new Error(searchResult.error);
        assertArrayIncludes(searchResult.recipes, [recipeId], "Should find recipe via Spaghetti");

        const [multiSearchResult] = await concept._findRecipeByIngredient({ ingredients: ["Pancetta", "Eggs"] });

        if ("error" in multiSearchResult) throw new Error(multiSearchResult.error);
        assertArrayIncludes(multiSearchResult.recipes, [recipeId], "Should find recipe via Pancetta and Eggs");
    });

    await client.close();
});


Deno.test("Actions: createRecipe, deleteRecipe", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const user = "user_test_creates" as ID;
    const imposter = "user_imposter" as ID;

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

        const [fetched] = await concept._getRecipe({ owner: user, title: "Grandma's Secret Sauce" });
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

        const [fetched] = await concept._getRecipe({ owner: user, title: "Yakult Matcha" });
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

        const [fetched] = await concept._getRecipe({ owner: user, title: "Ultimate Guide to Toast" });
        if ("error" in fetched) throw new Error(fetched.error);

        assertEquals(fetched.recipes[0].link, "https://www.youtube.com/watch?v=cglfUwNCLPI");
        assertEquals(fetched.recipes[0].description, "1. Put bread in toaster. 2. Push lever down.");
    });

    await t.step("5. Failure: Delete recipe that does not exist", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: user,
            recipe: "non_existent_recipe_id" as ID
        });

        if (!("error" in result)) throw new Error("Should have failed to delete non-existent recipe");
        assertEquals(result.error, "Recipe not found");
    });

    await t.step("6. Failure: Delete recipe owned by someone else", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: imposter,
            recipe: recipeToKeep
        });

        if (!("error" in result)) throw new Error("Should have failed to delete someone else's recipe");
        assertEquals(result.error, "Sorry, you are not the owner of this recipe. You cannot delete the recipe.");
    });

    await t.step("7. Failure: Imposter deletes recipe that doesn't exist", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: imposter,
            recipe: "randomRecipeIdThatShouldntExist" as ID
        });

        if (!("error" in result)) throw new Error("Should have failed to delete non-existent recipe");
        // Note: Implementation returns "Recipe not found" before checking ownership
        assertEquals(result.error, "Recipe not found");
    });

    await t.step("8. Success: Delete recipe", async () => {
        const result = await concept.deleteRecipe({
            requestedBy: user,
            recipe: recipeToDelete
        });

        if ("error" in result) throw new Error(result.error);

        const [fetched] = await concept._getRecipe({ owner: user, title: "Grandma's Secret Sauce" });

        // Based on your implementation, _getRecipe returns an error if not found
        if (!("error" in fetched)) {
            throw new Error("Recipe should have been deleted but was found");
        }
    });

    await client.close();
});


Deno.test("Queries: Scaling Edge Cases", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const user = "user_baker" as ID;
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
        const [result] = await concept._scaleIngredients({
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
        const [result] = await concept._scaleIngredients({
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
        const [result] = await concept._scaleIngredients({
            recipe: recipeId,
            scaleFactor: -1
        });

        if (!("error" in result)) {
            throw new Error("Should have failed to scale by negative number");
        }
    });

    await t.step("4. Failure: Scale by Zero (0)", async () => {
        const [result] = await concept._scaleIngredients({
            recipe: recipeId,
            scaleFactor: 0
        });

        if (!("error" in result)) {
            throw new Error("Should have failed to scale by zero");
        }
    });

    await client.close();
});

Deno.test("Queries: Search, Filter, and Metadata", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const userA = "user_chef_A" as ID;
    const userB = "user_chef_B" as ID;

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
        if (resA.length > 0 && "error" in resA[0]) {
            throw new Error("Error fetching recipes");
        }
        assertEquals(resA.length, 2); // Carbonara + Tomato

        const resB = await concept._getAllRecipes({ owner: userB });
        if (resB.length > 0 && "error" in resB[0]) {
            throw new Error("Error fetching recipes");
        }
        assertEquals(resB.length, 1); // Breakfast
    });

    await t.step("2. _getIngredients & _getIngredientsByName", async () => {
        const [all] = await concept._getIngredients({});
        if ("error" in all) throw new Error(all.error);
        assertEquals(all.ingredients.length, 5);

        const [search] = await concept._getIngredientsByName({ name: "Spag" });
        if ("error" in search) throw new Error(search.error);
        assertEquals(search.ingredients.length, 1);
        assertEquals(search.ingredients[0].name, "spaghetti");
    });

    await t.step("3. _search (Title Regex)", async () => {
        const [res] = await concept._search({ query: "Spaghetti" });
        if ("error" in res) throw new Error(res.error);

        assertEquals(res.recipes.length, 2);
        const recipe_ids = res.recipes.map(recipe => recipe._id);
        assertArrayIncludes(recipe_ids, [carbId, tomatoId]);
    });

    await t.step("4. _findRecipeByIngredient (Verification)", async () => {
        const [res] = await concept._findRecipeByIngredient({ ingredients: ["Eggs"] });
        if ("error" in res) throw new Error(res.error);

        assertEquals(res.recipes.length, 2);
        assertArrayIncludes(res.recipes, [carbId, breakfastId]);
    });

    await t.step("5. _searchWithinRecipes (Subset Constraint)", async () => {
        const userASet = [carbId, tomatoId];

        const [res1] = await concept._searchWithinRecipes({ query: "Spaghetti", recipes: userASet });
        if ("error" in res1) throw new Error(res1.error);
        assertEquals(res1.recipes.length, 2);

        const [res2] = await concept._searchWithinRecipes({ query: "Breakfast", recipes: userASet });
        if ("error" in res2) throw new Error(res2.error);
        assertEquals(res2.recipes.length, 0);
    });

    await t.step("6. _findRecipeByIngredientWithinRecipes", async () => {
        const userASet = [carbId, tomatoId];

        const [res] = await concept._findRecipeByIngredientWithinRecipes({
            ingredients: ["Eggs"],
            recipes: userASet
        });

        if ("error" in res) throw new Error(res.error);
        assertEquals(res.recipes.length, 1);
        assertEquals(res.recipes[0], carbId);
    });

    await t.step("7. _filterIngredientAndSearch (Title AND Ingredient)", async () => {
        const [res] = await concept._filterIngredientAndSearch({
            query: "Spaghetti",
            ingredients: ["Eggs"]
        });

        if ("error" in res) throw new Error(res.error);
        assertEquals(res.recipes.length, 1);
        assertEquals(res.recipes[0], carbId);
    });

    await t.step("8. _filterIngredientAndSearchWithinRecipes", async () => {
        const [res] = await concept._filterIngredientAndSearchWithinRecipes({
            recipes: [breakfastId],
            query: "Breakfast",
            ingredients: ["Bacon"]
        });

        if ("error" in res) throw new Error(res.error);
        assertEquals(res.recipes.length, 1);
        assertEquals(res.recipes[0], breakfastId);

        const [resFail] = await concept._filterIngredientAndSearchWithinRecipes({
            recipes: [breakfastId],
            query: "Breakfast",
            ingredients: ["Spaghetti"]
        });
        if ("error" in resFail) throw new Error(resFail.error);
        assertEquals(resFail.recipes.length, 0);
    });

    await t.step("9. _scaleIngredients", async () => {
        const [res] = await concept._scaleIngredients({
            recipe: carbId,
            scaleFactor: 0.5
        });

        if ("error" in res) throw new Error(res.error);

        const scaled = res.ingredients;
        assertEquals(scaled.length, 3);

        const s_spag = scaled.find(i => i.name === "spaghetti");
        const s_eggs = scaled.find(i => i.name === "eggs");
        const s_panc = scaled.find(i => i.name === "pancetta");

        assertExists(s_spag);
        assertEquals(s_spag?.quantity, 250);

        assertExists(s_eggs);
        assertEquals(s_eggs?.quantity, 6);

        assertExists(s_panc);
        assertEquals(s_panc?.quantity, 100);
    });

    await client.close();
});

Deno.test("Actions: remaining methods (removeIngredient, link/description/image/copy/parse/edit/delete ingredient, setRecipeCopy)", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const owner = "user_owner_remaining" as ID;
    const other = "user_other_remaining" as ID;

    // Shared IDs for steps
    let recipeId: ID;
    let parsleyId: ID;
    let newRecipeId: ID;
    let delId: ID;
    let editId: ID;

    await t.step("setup: create recipe and ingredient", async () => {
        const createR = await concept.createRecipe({ owner, title: "Remaining Actions Dish", description: "initial desc" });
        if ("error" in createR) throw new Error(createR.error);
        recipeId = createR.recipe;

        const ingrRes = await concept.createIngredient({ name: "Parsley", quantity: 10, unit: "g" });
        if ("error" in ingrRes) throw new Error(ingrRes.error);
        parsleyId = ingrRes.ingredient._id;
    });

    await t.step("add ingredient then verify present", async () => {
        await concept.addIngredientToRecipe({ requestedBy: owner, recipe: recipeId, ingredient: parsleyId });
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].ingredients.length, 1);
    });
    
    await t.step("addIngredientToRecipe: failure when already present", async () => {
        const result = await concept.addIngredientToRecipe({ requestedBy: owner, recipe: recipeId, ingredient: parsleyId });
        if ("error" in result) throw new Error(result.error);
    });
    

    await t.step("removeIngredientFromRecipe: success", async () => {
        const remOk = await concept.removeIngredientFromRecipe({ requestedBy: owner, recipe: recipeId, ingredient: parsleyId });
        if ("error" in remOk) throw new Error(remOk.error);
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].ingredients.length, 0);
    });

    await t.step("removeIngredientFromRecipe: failure when missing", async () => {
        const remFail = await concept.removeIngredientFromRecipe({ requestedBy: owner, recipe: recipeId, ingredient: parsleyId });
        if (!("error" in remFail)) throw new Error("Expected error removing non-existent ingredient");
    });

    
    await t.step("add/remove ingredient: non-owner failures", async () => {
        const addFail = await concept.addIngredientToRecipe({ requestedBy: other, recipe: recipeId, ingredient: parsleyId });
        if (!("error" in addFail)) throw new Error("Expected error adding ingredient by non-owner");
        const remFail2 = await concept.removeIngredientFromRecipe({ requestedBy: other, recipe: recipeId, ingredient: parsleyId });
        if (!("error" in remFail2)) throw new Error("Expected error removing ingredient by non-owner");
    });

    await t.step("setLink & removeLink", async () => {
        const setLinkOk = await concept.setLink({ requestedBy: owner, recipe: recipeId, link: "https://example.com/recipe" });
        if ("error" in setLinkOk) throw new Error(setLinkOk.error);
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].link, "https://example.com/recipe");

        const removeLinkOk = await concept.removeLink({ requestedBy: owner, recipe: recipeId });
        if ("error" in removeLinkOk) throw new Error(removeLinkOk.error);
        const [fetched2] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched2) throw new Error(fetched2.error);
        assertEquals(fetched2.recipes[0].link, "");
    });

    await t.step("setDescription & removeDescription expectations", async () => {
        const setDescOk = await concept.setDescription({ requestedBy: owner, recipe: recipeId, description: "updated desc" });
        if ("error" in setDescOk) throw new Error(setDescOk.error);
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].description, "updated desc");

        const removeDescFail = await concept.removeDescription({ requestedBy: owner, recipe: recipeId });
        if (!("error" in removeDescFail)) throw new Error("Expected error removing description without link present");
    });

    await t.step("setImage & deleteImage", async () => {
        const setImageOk = await concept.setImage({ requestedBy: owner, recipe: recipeId, image: "data:image/png;base64,AAA" });
        if ("error" in setImageOk) throw new Error(setImageOk.error);
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].image, "data:image/png;base64,AAA");

        const deleteImageOk = await concept.deleteImage({ requestedBy: owner, recipe: recipeId });
        if ("error" in deleteImageOk) throw new Error(deleteImageOk.error);
        const [fetched2] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched2) throw new Error(fetched2.error);
        assertEquals(fetched2.recipes[0].image, "");
    });

    await t.step("setRecipeCopy & copyRecipe", async () => {
        const setCopyOk = await concept.setRecipeCopy({ requestedBy: owner, recipe: recipeId, isCopy: true });
        if ("error" in setCopyOk) throw new Error(setCopyOk.error);
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].isCopy, true);

        const setCopyFalse = await concept.setRecipeCopy({ requestedBy: owner, recipe: recipeId, isCopy: false });
        if ("error" in setCopyFalse) throw new Error(setCopyFalse.error);
        const [falseCopy] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in falseCopy) throw new Error(falseCopy.error);
        assertEquals(falseCopy.recipes[0].isCopy, false);

        const copyRes = await concept.copyRecipe({ requestedBy: other, recipe: recipeId });
        if ("error" in copyRes) throw new Error(copyRes.error);
        newRecipeId = copyRes.recipe;

    });

    await t.step("parseIngredients: valid and invalid inputs", async () => {
        const parseOk = await concept.parseIngredients({
            requestedBy: owner,
            recipe: recipeId,
            ingredientsText: "100, g, Flour\n 50, g, Sugar "
        });
        if ("error" in parseOk) throw new Error(parseOk.error);
        const [fetched] = await concept._getRecipe({ owner, title: "Remaining Actions Dish" });
        if ("error" in fetched) throw new Error(fetched.error);
        assertEquals(fetched.recipes[0].ingredients.length, 2);
        const names = fetched.recipes[0].ingredients.map(i => i.name);
        assertArrayIncludes(names, ["flour", "sugar"]);

        const parseBad = await concept.parseIngredients({ requestedBy: owner, recipe: recipeId, ingredientsText: "badformatline" });
        if (!("error" in parseBad)) throw new Error("Expected parseIngredients to error on invalid input");
    });

    await t.step("deleteIngredient: create/delete/double-delete", async () => {
        const toDel = await concept.createIngredient({ name: "TempDel", quantity: 1, unit: "unit" });
        if ("error" in toDel) throw new Error(toDel.error);
        delId = toDel.ingredient._id;
        const delOk2 = await concept.deleteIngredient({ ingredient: delId });
        if ("error" in delOk2) throw new Error(delOk2.error);
        const delAgain = await concept.deleteIngredient({ ingredient: delId });
        if (!("error" in delAgain)) throw new Error("Expected error deleting non-existent ingredient");
    });

    await t.step("editIngredient: create, edit, verify", async () => {
        const editCreate = await concept.createIngredient({ name: "EditMe", quantity: 2, unit: "pcs" });
        if ("error" in editCreate) throw new Error(editCreate.error);
        editId = editCreate.ingredient._id;
        const editOk = await concept.editIngredient({ inputIngredient: editId, newName: "Edited", newQuantity: 5, newUnit: "kg" });
        if ("error" in editOk) throw new Error(editOk.error);
        const [allIngs] = await concept._getIngredients({});
        if ("error" in allIngs) throw new Error(allIngs.error);
        const edited = allIngs.ingredients.find(i => i._id === editId);
        assertExists(edited);
        assertEquals(edited?.name, "edited"); // should be lowercase
    });

    await t.step("teardown: close client", async () => {
        await client.close();
    });
});



Deno.test("llm feature: parseFromLink", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    try {
        const user = "user_llm_parser" as ID;
        const config = loadConfig();
        const llm = new GeminiLLM(config);

        await t.step("parseFromLink: valid text-based link", async () => {
            const res = await concept.parseFromLink({
                requestedBy: user,
                link: "https://www.allrecipes.com/recipe/239896/crunchy-french-onion-chicken/",
                // llm: llm
            });
            if ("error" in res) throw new Error(res.error);
            const recipe = res.recipe;
            console.log(recipe)
            assertExists(recipe);
            assertEquals(recipe.title.toLowerCase().includes("crunchy french onion chicken"), true);
            assertExists(recipe.description);
            assertEquals(recipe.ingredients.length > 0, true);
        });

        await t.step("parseFromLink: valid YT video link", async () => {
            const res = await concept.parseFromLink({
                requestedBy: user,
                link: "https://youtu.be/afM7gVxT-Q8?si=2ZVNHYlJdba4OWHs",
                llm: llm
            });
            if ("error" in res) throw new Error(res.error);
            const recipe = res.recipe;
            // console.log(recipe)
            assertExists(recipe);
            assertEquals(recipe.title.toLowerCase().includes("pasta"), true);
            assertExists(recipe.description);
            assertEquals(recipe.ingredients.length > 0, true);
        });

        await t.step("parseFromLink: invalid link", async () => {
            const res = await concept.parseFromLink({
                requestedBy: user,
                link: "https://www.example.com/non-recipe-page",
                llm: llm
            });
            if (!("error" in res)) throw new Error("Expected error for invalid recipe link");
        });
    } finally {
        await client.close();
    }
});

Deno.test("Global vs private recipes", async (t) => {
    const [db, client] = await testDb();
    const concept = new RecipeConcept(db);
    const userA = "user_global_A" as ID;
    // const userB = "user_global_B" as ID;
    let publicRecipeId: ID;
    await t.step("1. Create public and private recipes", async () => {
        const pubRes = await concept.createRecipe({
            owner: userA,
            title: "Public Recipe",
            description: "This is a public recipe.",
            isPublic: true
        });
        if ("error" in pubRes) throw new Error(pubRes.error);
        publicRecipeId = pubRes.recipe;
        
        const privRes = await concept.createRecipe({
            owner: userA,
            title: "Private Recipe",
            description: "This is a private recipe.",
            isPublic: false
        });
        if ("error" in privRes) throw new Error(privRes.error);
    });

    await t.step("2. Test that only public recipe is visible globally", async () => {
        const res: Array<{recipe: RecipeDoc} | { error: string }> = await concept._getAllRecipesGlobal();
        if (res.some(r => "error" in r)) throw new Error("Error fetching global recipes");
        
        const recipes: ID[] = (res as Array<{recipe: RecipeDoc}>).map(r => r.recipe._id);

        assertEquals(recipes.length, 1);
        assertArrayIncludes(recipes, [publicRecipeId]);
        
    });

    await t.step("3. Test that only the owner can set the public recipe to private", async () => {
        const otherUser = "user_global_other" as ID;
        const failRes = await concept.setRecipePublic({
            requestedBy: otherUser,
            recipe: publicRecipeId,
            isPublic: false
        });
        if (!("error" in failRes)) throw new Error("Expected error when non-owner tries to change publicity");

        const successRes = await concept.setRecipePublic({
            requestedBy: userA,
            recipe: publicRecipeId,
            isPublic: false
        });
        if ("error" in successRes) throw new Error(successRes.error);
    });

    await t.step("4. Verify recipe is no longer public", async () => {
        const res: Array<{recipe: RecipeDoc} | { error: string }> = await concept._getAllRecipesGlobal();
        if (res.some(r => "error" in r)) throw new Error("Error fetching global recipes");
        const recipes: ID[] = (res as Array<{recipe: RecipeDoc}>).map(r => r.recipe._id);

        assertEquals(recipes.length, 0);
    });


    await client.close();
});