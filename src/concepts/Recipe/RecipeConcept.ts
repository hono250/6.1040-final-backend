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
    title: string,
    ingredients: IngredientDoc[];
    image?: string;
    link?: string;
    description: string;
    isCopy: boolean;
}

interface IngredientDoc {
    _id: Ingredient,
    quantity: number;
    name: string;
    unit: string;
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


    /**
     * createRecipe(owner: User, title: String, link?: String, description?: String): (recipe: Recipe)
     *
     * **requires** this `owner` doesn't already have a Recipe with this `title`
     *
     * **effects** creates a new `Recipe` with this `owner`, this `title`, and (this `link` or this `description`), returns this recipe
     */
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
    /**
     * deleteRecipe(requestedBy: User, recipe: Recipe)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *
     * **effects** removes this `recipe` from the set of `Recipe`s
     */
    async deleteRecipe({ requestedBy, recipe }: { requestedBy: User, recipe: Recipe }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        await this.recipes.deleteOne({ _id: recipe });
        return {};
    }

    /**
     * addIngredientToRecipe(requestedBy: User, recipe: Recipe, ingredient: Ingredient)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`, this `ingredient` isn't already in that `Recipe`
     *
     * **effects** adds this `ingredient` to the `Recipe` with this `owner` and this `title`
     */
    async addIngredientToRecipe({ requestedBy, recipe, ingredient }: { requestedBy: User, recipe: Recipe, ingredient: Ingredient }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        const ingredDoc = await this.ingredients.findOne({ _id: ingredient }); 
        if (!ingredDoc) {
            return { error: "Ingredient not found" };
        }

        // check if ingredient already exists
        const alreadyExists = existing.ingredients.some((ing) => ing._id === ingredDoc._id);
        if (alreadyExists) {
            return {};
        }

        await this.recipes.updateOne(
            { _id: recipe },
            { $push: { ingredients: ingredDoc } }
        );
        return {};
    }

    /**
     * removeIngredientFromRecipe(requestedBy: User, recipe: Recipe, ingredient: Ingredient)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`, this `ingredient` exists in this `recipe`
     *
     * **effects** removes this `ingredient` from this `recipe`
     */
    async removeIngredientFromRecipe({ requestedBy, recipe, ingredient }: { requestedBy: User, recipe: Recipe, ingredient: Ingredient }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        const ingredDoc = await this.ingredients.findOne({ _id: ingredient }); 
        if (!ingredDoc) {
            return { error: "Ingredient not found" };
        }
        
        const ingredExists = existing.ingredients.some((ing) => ing._id === ingredDoc._id);
        if (!ingredExists) {
            return { error: "ingredient doesn't exist in this recipe!" };
        }

        await this.recipes.updateOne({ _id: recipe }, { $pull: { ingredients: { _id: ingredDoc._id } } });
        return {};
    }

    /**
     * setLink(requestedBy: User, recipe: Recipe, link: String)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *
     * **effects** sets the `link` for this `recipe` to this `link`
     */
    async setLink({ requestedBy, recipe, link }: { requestedBy: User, recipe: Recipe, link: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        if (!this.isValidLink(link)) {
            return { error: "Invalid link format!" };
        }

        await this.recipes.updateOne({ _id: recipe }, { $set: { link } })
        return {};
    }

    /**
     * removeLink(requestedBy: User, recipe: Recipe)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`, this `recipe` has a `description`
     *
     * **effects** removes the `link` from this `recipe`
     */
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

    /**
     * setDescription(requestedBy: User, recipe: Recipe, description: String)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *
     * **effects** sets the `description` for this `recipe`
     */
    async setDescription({ requestedBy, recipe, description }: { requestedBy: User, recipe: Recipe, description: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        if (!description || description.trim() === "") {
            return { error: "Description must be more than just empty space" };
        }

        await this.recipes.updateOne({ _id: recipe }, { $set: { description } })
        return {};
    }

    /**
     * removeDescription(requestedBy: User, recipe: Recipe)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`, this `Recipe` has a `link`
     *
     * **effects** removes the `description` associated with this `recipe`
     */
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

    /**
     * setRecipeCopy(requestedBy: User, recipe: Recipe, isCopy: flag)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *
     * **effects** sets the `isCopy` in this `recipe` to this `isCopy`
     */
    async setRecipeCopy({ requestedBy, recipe, isCopy }: { requestedBy: User, recipe: Recipe, isCopy: boolean }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        await this.recipes.updateOne({ _id: recipe }, { $set: { isCopy } });
        return {};
    }

    /**
     * setImage(requestedBy: User, recipe: Recipe, image: String)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *
     * **effects** sets the `image` in this `recipe` to this `image`
     */
    async setImage({ requestedBy, recipe, image }: { requestedBy: User, recipe: Recipe, image: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        await this.recipes.updateOne({ _id: recipe }, { $set: { image } });
        return {};
    }

    /**
     * deleteImage(requestedBy: User, recipe: Recipe)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`, image exists in this `recipe`
     *
     * **effects** removes the `image` in this recipe
     */
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

    /**
     * copyRecipe(requestedBy: User, recipe: Recipe): (recipe: Recipe)
     *
     * **requires** this `recipe` exists in the set of `Recipe`s
     *
     * **effects** creates a new `recipe` with the same fields as this `recipe`, but this `owner` is now this `requestedBy`, changes `isCopy` of this `recipe` and the new `recipe` to True, returns this new recipe
     */
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

    //TODO:
    // parseFromLink() (llm augmented)
    
    // Ingredient Actions

    /**
     * Helper to create ingredients
     * 
     * @param name ingredient name
     * @param quantity ingredient quantity
     * @param unit units of measurement for quantity
     * @returns (a promise of) the created IngredientDoc, with name in lowercase
     */
    private async createIngredientHelper(name: string, quantity: number, unit: string): Promise<IngredientDoc> {
        const newIngred: IngredientDoc = {
            _id: freshID(),
            name: name.toLowerCase(),
            quantity,
            unit,
        };
        await this.ingredients.insertOne(newIngred);
        return newIngred;
    }

    // Note: Is returning a list of IngredientDocs allowed (composite type)?
    /**
     * parseIngredients(requestedBy: User, recipe: Recipe, ingredientsText: String)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *  ingredientsText must be line separated and in the format: "quantity,unit,name" for each line
     *  
     * **effects** parses this `ingredientsText` into individual `Ingredient`s as part of this `recipe`'s `ingredients`
     */
    async parseIngredients({ requestedBy, recipe, ingredientsText }: { requestedBy: User, recipe: Recipe, ingredientsText: string }): Promise<{ ingredients: IngredientDoc[] } | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };
        // Simple parsing logic: each line is "quantity,unit,name"
        const lines = ingredientsText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        const createdIngredients: IngredientDoc[] = [];
        for (const line of lines) {
            const parts = line.split(",");
            if (parts.length !== 3) {
                return { error: `Invalid ingredient format: ${line}` };
            }
            const quantity = parseFloat(parts[0]);
            if (isNaN(quantity)) {
                return { error: `Invalid quantity: ${parts[0]}` };
            }
            const unit = parts[1];
            const name = parts[2];
            const newIngred = await this.createIngredientHelper(name, quantity, unit);
            createdIngredients.push(newIngred);
        }
        await this.recipes.updateOne({ _id: recipe }, { $set: { ingredients: createdIngredients } });
        return { ingredients: createdIngredients };
    }

    /**
     * createIngredient(name: String, quantity: number, unit: String): (ingredient: Ingredient)
     *
     * **effects** creates a new `Ingredient` with this `name`, this `quantity`, and this `unit`, returns this ingredient
     */
    async createIngredient({ name, quantity, unit }: { name: string, quantity: number, unit: string }): Promise<{ ingredient: IngredientDoc } | { error: string }> {
        if (!name || name.trim() === "") {
            return { error: "Ingredient name cannot be empty." };
        }
        
        const newIngred = await this.createIngredientHelper(name, quantity, unit);
        return { ingredient: newIngred };
    }

    /**
     * deleteIngredient(ingredient: Ingredient)
     *
     * **requires** this `ingredient` exists in the set of `Ingredient`s
     *
     * **effects** removes this `ingredient` from the set of `Ingredient`s
     */
    async deleteIngredient({ ingredient }: { ingredient: Ingredient }): Promise<Empty | { error: string }> {
        const existing = await this.ingredients.findOne({ _id: ingredient });
        if (!existing) {
            return { error: "Ingredient not found" };
        }
        await this.ingredients.deleteOne({ _id: ingredient });
        return {};
    }
    /**
     * editIngredient(inputIngredient: Ingredient, newName?: String, newQuantity?: number, newUnit?: String): (ingredient: Ingredient)
     *
     * **effects** modifies `inputIngredient` to have `newName`, `newAmount`, and `newUnit`, leaving omitted fields unmodified
     */
    async editIngredient({ inputIngredient, newName, newQuantity, newUnit }: { inputIngredient: Ingredient, newName?: string, newQuantity?: number, newUnit?: string }): Promise<Empty | { error: string }> {
        const existing = await this.ingredients.findOne({ _id: inputIngredient });
        if (!existing) {
            return { error: "Ingredient not found" };
        }
        const updateFields: Partial<IngredientDoc> = {};
        if (newName && newName.trim() !== "") {
            updateFields.name = newName;
        }
        if (newQuantity !== undefined) {
            updateFields.quantity = newQuantity;
        }
        if (newUnit && newUnit.trim() !== "") {
            updateFields.unit = newUnit;
        }
        await this.ingredients.updateOne({ _id: inputIngredient }, { $set: updateFields });
        return {};
    }

    // async parseFromLink({ link }: { link: string }): Promise<{ recipeData: any } | { error: string }> {
        
    // }



    /**
     *
     *
     * QUERIES
     *
     *
     */

    /**
     * _findRecipeByIngredient(ingredients: List<String>): (recipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` that have these `ingredients` (which are the food names), where the initial recipes are the ones that have the most ingredients in these `ingredients`
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

    /**
     * _search(query: String): (recipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` that have this `query` in this `title`
     */
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

    /**
     * _findRecipeByIngredientWithinRecipes(ingredients: List<String>, recipes: List<Recipe>): (newRecipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` in these `recipes` that have these `ingredients` (which are the food names), where the initial recipes are the ones that have the most ingredients in these `ingredients`
     */
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

    /**
     * _searchWithinRecipes(query: String, recipes: List<Recipe>): (newRecipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` in these `recipes` that have this `query` in this `title`
     */
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

    /**
     * _filterIngredientAndSearch(query: String, ingredients: List<String>): (recipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` that have this `query` in this `title` and these `ingredients`, where the initial recipes are the ones that have the most ingredients in these `ingredients`
     */
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

    /**
     * _filterIngredientAndSearchWithinRecipes(recipes: List<Recipe>, query: String, ingredients: List<String>): (newRecipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` in these `recipes` that have this `query` in this `title` and these `ingredients`, where the initial recipes are the ones that have the most ingredients in these `ingredients`
     */
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

    /**
     * _getRecipe(owner: User, title: String): (recipes: List<Recipe>)
     *
     * **requires** this `owner` and this `title` exists in the set of `Recipes`
     *
     * **effects** returns the `Recipe`s associated with this `owner` and this `title`
     */
    async _getRecipe({ owner, title }: { owner: User, title: string }): Promise<{ recipes: RecipeDoc[] } | { error: string }> {
        if (!owner) {
            return { error: "Owner ID is required." };
        }
        if (!title || title.trim().length === 0) {
            return { error: "Title cannot be empty." };
        }


        const recipes = await this.recipes.find({ owner, title }).toArray();
        if (recipes.length === 0) {
            return { error: `Recipe with title "${title}" for this owner not found.` };
        }

        return { recipes };
    }

    /**
     * _getAllRecipes(owner: User): (recipes: List<Recipe>)
     *
     * **requires** this `owner` exists in the set of `Recipes`
     *
     * **effects** returns all the `Recipe`s associated with this `owner`
     */
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

    // _getIngredients()
    /**
     * _getIngredients(): (ingredients: List<Ingredient>)
     *
     * **effects** returns all the `Ingredient`s in the set of `Ingredient`s
     */
    async _getIngredients({}: Empty): Promise<{ ingredients: IngredientDoc[] } | { error: string }> {
        try {
            const ingredients: IngredientDoc[] = await this.ingredients
                .find({})
                .toArray();
            return { ingredients };
        } catch (err: any) {
            return { error: `Failed to fetch ingredients: ${err.message}` };
        }
    }

    // _getIngredientsByName()
    /**
     * _getIngredientsByName(name: String): (ingredients: List<Ingredient>)
     *
     * **requires** this `name` to exists in the set of `Ingredient`s
     *
     * **effects** returns all the `Ingredient`s that have this `name`
     */
    async _getIngredientsByName({ name }: { name: string }): Promise<{ ingredients: IngredientDoc[] } | { error: string }> {
        if (!name || name.trim().length === 0) {
            return { error: "Ingredient name cannot be empty." };
        }
        try {
            const ingredients: IngredientDoc[] = await this.ingredients
                .find({ name: { $regex: name, $options: "i" } })
                .toArray();
            return { ingredients };
        } catch (err: any) {
            return { error: `Failed to fetch ingredients by name: ${err.message}` };
        }

    }

    // _scaleIngredients()
    /**
     * _scaleIngredients(inputIngredients: List<Ingredient>, scale: number): (ingredients: List<Ingredient>)
     *
     * **requires** this `scale` is a positive number
     *
     * **effects** creates an ingredients for each ingredient in this `inputIngredients` (without adding to set of `Ingredients`) with `amount = amount * scale`, and returns the list of those ingredients.
     */
    async _scaleIngredients({ recipe, scaleFactor }: { recipe: Recipe, scaleFactor: number }): Promise<{ ingredients: IngredientDoc[] } | { error: string }> {
        const existing = await this.recipes.findOne({ _id: recipe });
        if (!existing) {
            return { error: "Recipe not found" };
        }
        const scaledIngredients: IngredientDoc[] = existing.ingredients.map((ingred) => ({
            ...ingred,
            quantity: ingred.quantity * scaleFactor,
        }));
        return { ingredients: scaledIngredients };
    }
}
