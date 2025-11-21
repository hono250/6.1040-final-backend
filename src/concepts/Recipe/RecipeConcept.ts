import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


const PREFIX = "Recipe" + ".";

type User = ID;
type Ingredient = ID;
type Recipe = ID;

interface RecipeDoc {
    _id: Recipe;
    owner: User;
    title: String,
    ingredients: IngredientDoc[];
    image?: String;
    link?: String;
    description: String;
    isCopy: boolean;
}

interface IngredientDoc {
    _id: Ingredient,
    quantity: number;
    name: String;
    unit: String;
}


export default class RecipeConcept {
    private recipes: Collection<RecipeDoc>;
    private ingredients: Collection<IngredientDoc>;

    constructor(private readonly db: Db) {
        this.recipes = this.db.collection(PREFIX + "recipes");
        this.ingredients = this.db.collection(PREFIX + "ingredients");
    }

    private isValidLink(link: string): boolean {
        try {
            new URL(link);
            return true;
        } catch {
            return false;
        }
    }


    async createRecipe({ owner, title, link, description }: { owner: User, title: string, link?: string, description?: string }): Promise<{ recipe: Recipe } | { error: string }> {
        const existing = await this.recipes.findOne({ owner, title });

        if (existing) {
            return { error: `Recipe with title: "${title}" already exists for this user: ${owner}` };
        }

        if (!link && !description) {
            return { error: `Recipe must have at least a link or description!` };
        }

        if (link && !this.isValidLink(link)) {
            return { error: "Invalid link format!" };
        }

        const newRecipe: RecipeDoc = {
            _id: freshID(),
            owner,
            title,
            ingredients: [],
            link: link ?? "",
            description: description ?? "",
            isCopy: false,
        }

        await this.recipes.insertOne(newRecipe);

        return { recipe: newRecipe._id };
    }

    private async checkRecipeAndOwner({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<RecipeDoc | { error: string }> {
        const existing = await this.recipes.findOne({ _id: recipe });
        if (!existing) {
            return { error: "Recipe not found" };
        }

        if (existing.owner !== requestedBy) {
            return { error: "Sorry, you are not the owner of this recipe. You cannot delete the recipe." };
        }
        return existing;
    }
    async deleteRecipe({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<Empty | { error: string }> {
        this.checkRecipeAndOwner({ requestedBy, recipe });
        await this.recipes.deleteOne({ _id: recipe });
        return {};
    }

    async addIngredientToRecipe({ requestedBy, recipe, ingredient }: { requestedBy: User, recipe: Recipe, ingredient: Ingredient }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        // check if ingredient already exists
        const alreadyExists = existing.ingredients.some((ing) => ing._id === ingredient._id);
        if (alreadyExists) {
            return {};
        }

        await this.recipes.updateOne(
            { _id: recipe },
            { $push: { ingredients: ingredient } }
        );
        return {};
    }

    async removeIngredientFromRecipe({ requestedBy, recipe, ingredient }: { requestedBy: User, recipe: Recipe, ingredient: Ingredient }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };
        const ingredExists = existing.ingredients.some((ing) => ing._id === ingredient._id);
        if (!ingredExists) {
            return { error: "ingredient doesn't exist in this recipe!" };
        }

        await this.recipes.updateOne({ _id: recipe }, { $pull: { ingredients: { _id: ingredient._id } } });
        return {};
    }

    async setLink({ requestedBy, recipe, link }: { requestedBy: User, recipe: Recipe, link: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        if (!this.isValidLink(link)) {
            return { error: "Invalid link format!" };
        }

        await this.recipes.updateOne({ _id: recipe }, { $set: { link } })
        return {};
    }

    async removeLink({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        if (!existing.description || existing.description.trim() === "") {
            return { error: "Cannot remove link because the recipe has no description." };
        }

        await this.recipes.updateOne(
            { _id: recipe },
            { $set: { link: "" } }
        );
        return {};
    }

    async setDescription({ requestedBy, recipe, description }: { requestedBy: User, recipe: Recipe, description: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        if (!existing.description || existing.description.trim() === "") {
            return { error: "Description must be more than just empty space" };
        }

        await this.recipes.updateOne({ _id: recipe }, { $set: { description } })
        return {};
    }

    async removeDescription({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        if (!existing.link) {
            return { error: "Cannot remove description because the recipe has no link." };
        }

        await this.recipes.updateOne(
            { _id: recipe },
            { $set: { description: "" } }
        );
        return {};
    }

    async setRecipeCopy({ requestedBy, recipe, isCopy }: { requestedBy: User, recipe: Recipe, isCopy: boolean }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        await this.recipes.updateOne({ _id: recipe }, { $set: { isCopy } });
        return {};
    }

    async setImage({ requestedBy, recipe, image }: { requestedBy: User, recipe: Recipe, image: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        await this.recipes.updateOne({ _id: recipe }, { $set: { image } });
        return {};
    }

    async deleteImage({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        // TODO: check that an image exists and if it doesn't just return immediately?
        if (!existing.image || existing.image.trim() === "") {
            return {};
        }

        await this.recipes.updateOne({ _id: recipe }, { $set: { image: "" } });
        return {};
    }

    async copyRecipe({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<{ recipe: Recipe } | { error: string }> {
        const existing = await this.recipes.findOne({ _id: recipe });
        if (!existing) {
            return { error: "Recipe not found" };
        }

        const newRecipe: RecipeDoc = {
            _id: freshID(),
            owner: requestedBy,
            title: existing.title,
            ingredients: existing.ingredients,
            link: existing.link ?? "",
            description: existing.description ?? "",
            image: existing.image ?? "",
            isCopy: true,
        }

        await this.recipes.insertOne(newRecipe);

        await this.recipes.updateOne({ _id: recipe }, { $set: { isCopy: true } });

        return { recipe: newRecipe._id };
    }



    /**
     *
     *
     * QUERIES
     *
     *
     */

    async _findRecipeByIngredient({ ingredients }: { ingredients: string[] }): Promise<{ recipes: Recipe[] } | { error: string }> {
        if (!ingredients || ingredients.length === 0) {
            return { error: "Ingredients list cannot be empty." };
        }

        const normalized = ingredients.map((i) => i.toLowerCase());
        const allRecipes = await this.recipes.find({}).toArray();
        // filter recipes by amount of ingredients matched
        const scored = allRecipes
            .map((recipe: RecipeDoc) => {
                const matchCount = recipe.ingredients.filter((ingred: IngredientDoc) =>
                    normalized.includes(ingred.name.toLowerCase())
                ).length;
                return { recipe, matchCount };
            })
            .filter((entry: { recipe: RecipeDoc; matchCount: number }) => entry.matchCount > 0); // keep recipes that actually have ingredients

        // none found
        if (scored.length === 0) {
            return { recipes: [] };
        }
        scored.sort((a: { recipe: RecipeDoc; matchCount: number }, b: { recipe: RecipeDoc; matchCount: number }) => b.matchCount - a.matchCount);
        const sortedRecipeIds = scored.map((entry: { recipe: RecipeDoc; matchCount: number }) => entry.recipe._id);

        return { recipes: sortedRecipeIds };
    }

    async _search({ query }: { query: string }): Promise<{ recipes: Recipe[] } | { error: string }> {
        if (!query || query.trim().length === 0) {
            return { error: "Query shouldn't be empty" };
        }

        const normalized = query.toLowerCase();

        const matchingRecipes: RecipeDoc[] = await this.recipes
            .find({
                title: { $regex: normalized, $options: "i" },
            })
            .toArray();

        const recipeIds: Recipe[] = matchingRecipes.map((r) => r._id);

        return { recipes: recipeIds };
    }

    async _findRecipeByIngredientWithinRecipes({ ingredients, recipes }: { ingredients: string[], recipes: Recipe[] }): Promise<{ recipes: Recipe[] } | { error: string }> {
        if (!ingredients || ingredients.length === 0) {
            return { error: "Ingredients list cannot be empty." };
        }

        if (!recipes || recipes.length === 0) {
            return { recipes: [] }; // no recipes to filter
        }

        const normalized = ingredients.map((i) => i.toLowerCase());

        const recipeDocs: RecipeDoc[] = await this.recipes
            .find({ _id: { $in: recipes } })
            .toArray();

        const scored = recipeDocs
            .map((recipe: RecipeDoc) => {
                const matchCount = recipe.ingredients.filter((ingred: IngredientDoc) =>
                    normalized.includes(ingred.name.toLowerCase())
                ).length;
                return { recipe, matchCount };
            })
            .filter((entry: { recipe: RecipeDoc; matchCount: number }) => entry.matchCount > 0); // keep recipes that actually have ingredients

        // none found
        if (scored.length === 0) {
            return { recipes: [] };
        }
        scored.sort((a: { recipe: RecipeDoc; matchCount: number }, b: { recipe: RecipeDoc; matchCount: number }) => b.matchCount - a.matchCount);
        const sortedRecipeIds = scored.map((entry: { recipe: RecipeDoc; matchCount: number }) => entry.recipe._id);

        return { recipes: sortedRecipeIds };
    }

    async _searchWithinRecipes({ query, recipes }: { query: string, recipes: Recipe[] }): Promise<{ recipes: Recipe[] } | { error: string }> {
        if (!query || query.trim().length === 0) {
            return { error: "Query shouldn't be empty" };
        }

        if (!recipes || recipes.length === 0) {
            return { recipes: [] }; // no recipes to filter
        }

        const normalized = query.toLowerCase();

        const matchingRecipes: RecipeDoc[] = await this.recipes
            .find({
                _id: { $in: recipes },
                title: { $regex: normalized, $options: "i" },
            })
            .toArray();

        const recipeIds: Recipe[] = matchingRecipes.map((r) => r._id);

        return { recipes: recipeIds };
    }

    async _filterIngredientAndSearch({ query, ingredients }: { query: string, ingredients: string[] }): Promise<{ recipes: Recipe[] } | { error: string }> {
        if (!query || query.trim().length === 0) {
            return { error: "Query cannot be empty." };
        }
        if (!ingredients || ingredients.length === 0) {
            return { error: "Ingredients list cannot be empty." };
        }

        const normalizedQuery = query.toLowerCase();
        const normalizedIngredients = ingredients.map((i) => i.toLowerCase());

        // Fetch all recipes that match the query in the title
        const recipeDocs: RecipeDoc[] = await this.recipes
            .find({
                title: { $regex: normalizedQuery, $options: "i" },
            })
            .toArray();

        const scored = recipeDocs
            .map((recipe) => {
                const matchCount = recipe.ingredients.filter((ingred) =>
                    normalizedIngredients.includes(ingred.name.toLowerCase())
                ).length;

                return { recipe, matchCount };
            })
            .filter((entry) => entry.matchCount > 0); // keep only matches

        scored.sort((a, b) => b.matchCount - a.matchCount);

        const sortedIds: Recipe[] = scored.map((entry) => entry.recipe._id);

        return { recipes: sortedIds };
    }

    async _filterIngredientAndSearchWithinRecipes({
        recipes,
        query,
        ingredients,
    }: {
        recipes: Recipe[];
        query: string;
        ingredients: string[];
    }): Promise<{ recipes: Recipe[] } | { error: string }> {
        if (!query || query.trim().length === 0) {
            return { error: "Query cannot be empty." };
        }
        if (!ingredients || ingredients.length === 0) {
            return { error: "Ingredients list cannot be empty." };
        }
        if (!recipes || recipes.length === 0) {
            return { recipes: [] }; // nothing to filter
        }

        const normalizedQuery = query.toLowerCase();
        const normalizedIngredients = ingredients.map((i) => i.toLowerCase());

        // Fetch only the recipes in the provided list that match the title query
        const recipeDocs: RecipeDoc[] = await this.recipes
            .find({
                _id: { $in: recipes },
                title: { $regex: normalizedQuery, $options: "i" },
            })
            .toArray();

        // Score recipes by number of matching ingredients
        const scored = recipeDocs
            .map((recipe) => {
                const matchCount = recipe.ingredients.filter((ingred) =>
                    normalizedIngredients.includes(ingred.name.toLowerCase())
                ).length;
                return { recipe, matchCount };
            })
            .filter((entry) => entry.matchCount > 0);

        // Sort by matchCount descending
        scored.sort((a, b) => b.matchCount - a.matchCount);

        const sortedIds: Recipe[] = scored.map((entry) => entry.recipe._id);

        return { recipes: sortedIds };
    }

    async _getRecipe({ owner, title }: { owner: User, title: String }): Promise<{ recipe: RecipeDoc } | { error: string }> {
        if (!owner) {
            return { error: "Owner ID is required." };
        }
        if (!title || title.trim().length === 0) {
            return { error: "Title cannot be empty." };
        }


        const recipe = await this.recipes.findOne({ owner, title });
        if (!recipe) {
            return { error: `Recipe with title "${title}" for this owner not found.` };
        }

        return { recipe };
    }

    async _getAllRecipes({ owner }: { owner: User }): Promise<{ recipes: RecipeDoc[] } | { error: string }> {
        if (!owner) {
            return { error: "Owner ID is required." };
        }

        try {
            const recipes: RecipeDoc[] = await this.recipes
                .find({ owner })
                .toArray();

            return { recipes };
        } catch (err: any) {
            return { error: `Failed to fetch recipes: ${err.message}` };
        }
    }
}
