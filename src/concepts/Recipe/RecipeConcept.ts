import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";
import { json } from "node:stream/consumers";

const PREFIX = "Recipe" + ".";

type User = ID;
type Ingredient = ID;
type Recipe = ID;

export interface RecipeDoc {
    _id: Recipe;
    owner: User;
    title: string,
    ingredients: IngredientDoc[];
    image?: string;
    link?: string;
    description: string;
    isCopy: boolean;
    isPublic?: boolean;
}

export interface IngredientDoc {
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
    async createRecipe({ owner, title, link, description, isPublic }: { owner: User, title: string, link?: string, description?: string, isPublic?: boolean }): Promise<{ recipe: Recipe } | { error: string }> {
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
            isPublic: isPublic ?? false,
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
            return { error: "Sorry, you are not the owner of this recipe. You cannot edit the recipe." };
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
     * setRecipe(requestedBy: User, recipe: Recipe: title: string)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`, this `title` doesn't exist in this `requestedBy`'s set of recipes
     *
     * **effects** updates this `recipe` to have this `title
     */
    async setRecipe({ requestedBy, recipe, title }: { requestedBy: User, recipe: Recipe, title: string }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        const duplicate = await this.recipes.findOne({
            owner: requestedBy,
            title: title
        });

        if (duplicate) {
            return { error: `A recipe with the title "${title}" already exists in your collection.` };
        }

        await this.recipes.updateOne(
            { _id: recipe, owner: requestedBy },
            { $set: { title: title } }
        );

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
     * setRecipePublic(requestedBy: User, recipe: Recipe, isPublic: flag)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *
     * **effects** sets the `isPublic` in this `recipe` to this `isPublic`
     */
    async setRecipePublic({ requestedBy, recipe, isPublic }: { requestedBy: User, recipe: Recipe, isPublic: boolean }): Promise<Empty | { error: string }> {
        const existing = await this.checkRecipeAndOwner({ requestedBy, recipe });
        if ("error" in existing) return { error: existing.error };

        await this.recipes.updateOne({ _id: recipe }, { $set: { isPublic } });
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
     * **effects** creates a new `recipe` with the same fields as this `recipe`, but this `owner` is now this `requestedBy`, changes `isCopy` of this `recipe` and the new `recipe` to True. Also sets the copy to private, and returns the new recipe
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
            isPublic: false,
        }

        await this.recipes.insertOne(newRecipe);

        await this.recipes.updateOne({ _id: recipe }, { $set: { isCopy: true } });

        return { recipe: newRecipe._id };
    }

    private generateLLMPrompt(link: string): string {
        return `
        You are a helpful AI tool that extracts recipe information from a given link. You are only allowed to return data in the json formatted below, no other text.

        **IMPORTANT INSTRUCTION FOR VIDEO LINKS (e.g., YouTube):** If the provided link is to a video, you must **analyze the video content (transcription/summary)** to identify the recipe title, description, and list of ingredients. Do not simply state you cannot extract the data; instead, use the video's contents or description box to find the recipe details.

        You need to find the following details:

        RECIPE DETAILS:
        - **Title**: The name of the recipe.
        - **Description**: A brief summary of the recipe. Summarize the description if it's long, and if there is no description, provide a short one based on the recipe.
        - **Ingredients**: A list of ingredients with their quantities and unit of measurements.
            - If an ingredient has no units (e.g., "7 limes"), use **""** (empty string) as the unit.
            - If the ingredient has no quantity (e.g., "salt to taste"), use **-1** as the quantity.

        Here is the link to extract the data from: ${link}

        You must visit the link and parse its contents (including transcribing or summarizing video content if applicable) to determine the recipe information.

        Once you've extracted the data, you must format the output **EXACTLY** as JSON with the following structure:
        {
            "title": "Recipe Title",
            "description": "Brief description of the recipe.",
            "ingredients": [
            {"name": "ingredient name", "quantity": "number OR string (e.g. 1, '1-2', '1/2')", "unit": "unit of measurement"},                ...
            ]
        }

        **STRICT FORMATTING RULE:** Do not include any other text outside of the JSON structure. Also do not put stand-ins into the json (e.g. "title": "could not extract title" is BAD, just return an error)

        For example, https://www.allrecipes.com/recipe/186625/spicy-lime-grilled-shrimp/ would yield:
        {
            "title": "Spicy Lime Grilled Shrimp",
            "description": "Grilled shrimp with a lime base and some kick!",
            "ingredients": [
                {"name": "shrimp", "quantity": 1, "unit": "pound"},
                {"name": "lime", "quantity": 1, "unit": ""},
                {"name": "Cajun seasoning", "quantity": 3, "unit": "tablespoons"},
                {"name": "vegetable oil", "quantity": 1, "unit": "tablespoon"}
            ]
        }

        Now, extract the recipe information from the link and format it as JSON as specified above.

        IMPORTANT: Do not include any other text than the one JSON object.
        `;
    }
    private validateLLMResponse(response: string): boolean {
        try {
            JSON.parse(response);
        } catch {
            console.log("LLM response is not valid JSON");
            return false;
        }

        const responseJson = JSON.parse(response);
        if ("error" in responseJson) {
            console.log("LLM reported error:", responseJson.error);
            return false;
        }
        if (!responseJson.title || !responseJson.description) {
            console.log("LLM response missing title or description");
            return false;
        }
        if (!Array.isArray(responseJson.ingredients)) {
            console.log("LLM response ingredients is not an array");
            return false;
        }
        for (const ingred of responseJson.ingredients) {
            const validQuantity = typeof ingred.quantity === "number" || typeof ingred.quantity === "string";
            if (!ingred.name || !validQuantity || ingred.unit === undefined) {
                console.log("LLM response ingredient missing name, quantity, or unit");
                return false;
            }
        }
        return true;
    }

    // helper to process ingredient quantity
    private processQuantity(val: string | number): number {
        if (typeof val === "number") return val;

        // 1. Map Unicode fractions to decimals
        const unicodeMap: { [key: string]: string } = {
            '½': ' 0.5', '⅓': ' 0.33', '⅔': ' 0.66',
            '¼': ' 0.25', '¾': ' 0.75', '⅕': ' 0.2',
            '⅖': ' 0.4', '⅗': ' 0.6', '⅘': ' 0.8',
            '⅙': ' 0.16', '⅚': ' 0.83', '⅛': ' 0.125',
            '⅜': ' 0.375', '⅝': ' 0.625', '⅞': ' 0.875'
        };

        // 2. Replace unicode chars
        let valStr = val.trim();
        for (const [char, replacement] of Object.entries(unicodeMap)) {
            if (valStr.includes(char)) {
                valStr = valStr.replace(char, replacement);
            }
        }

        // 3. Remove alphabetic characters (e.g. if LLM returned "1 pound", keep "1")
        // We keep digits, dots (.), slashes (/), hyphens (-), and spaces
        valStr = valStr.replace(/[a-zA-Z]/g, "").trim();

        // 4. Handle Ranges (e.g., "1-2") -> Returns Average
        if (valStr.includes("-")) {
            // Remove multiple hyphens if any, split by the first one
            const parts = valStr.split("-").filter(p => p.trim() !== "");
            if (parts.length === 2) {
                return (this.processQuantity(parts[0]) + this.processQuantity(parts[1])) / 2;
            }
        }

        // 5. Handle Mixed Numbers (e.g., "1 1/2" or "1 0.5") -> Sums them
        // If there is a space between numbers, we assume it's additive
        if (valStr.includes(" ")) {
            const parts = valStr.split(" ").filter(part => part.trim() !== "");
            // If we have multiple parts, sum them up (recursive)
            if (parts.length > 1) {
                return parts.reduce((acc, part) => acc + this.processQuantity(part), 0);
            }
        }

        // 6. Handle Fractions (e.g., "1/2")
        if (valStr.includes("/")) {
            const [num, den] = valStr.split("/");
            return parseFloat(num) / parseFloat(den);
        }

        // 7. Standard Float
        return parseFloat(valStr);
    }

    async parseFromLink({ requestedBy, link, llm }: { requestedBy: User, link: string, llm?: GeminiLLM }): Promise<{ recipe: RecipeDoc } | { error: string }> {
        if (!this.isValidLink(link)) {
            return { error: "Invalid link" };
        }
        if (llm === undefined) {
            const config = {
                apiKey: Deno.env.get("GEMINI_API_KEY") || "",
            };
            if (!config.apiKey) {
                return { error: "Gemini API key not configured." };
            }
            llm = new GeminiLLM(config);
        }

        let llmResponse = "";
        for (let attempt = 0; attempt < 3; attempt++) {
            const prompt = this.generateLLMPrompt(link);
            try {
                //Query LLM
                llmResponse = await llm.executeLLM(prompt);

                // Extract JSON from response
                llmResponse = llmResponse.substring(llmResponse.indexOf('{'), llmResponse.lastIndexOf('}') + 1);

                // Validate response
                if (!this.validateLLMResponse(llmResponse)) {
                    console.log("Invalid LLM response:", llmResponse);
                    throw new Error("Invalid LLM response");
                }

                // If valid, continue
                break;
            } catch (error) {
                if (attempt === 2) {
                    console.log("LLM request failed after 3 attempts:" + (error as Error).message);
                    return { error: "Failed to get response from LLM." + (error as Error).message };
                }
            }
        }

        const recipeData = JSON.parse(llmResponse);
        const ingredients: IngredientDoc[] = [];
        for (const ingred of recipeData.ingredients) {
            const finalQuantity = this.processQuantity(ingred.quantity);
            const safeQuantity = isNaN(finalQuantity) ? -1 : finalQuantity;
            const newIngred = await this.createIngredientHelper(ingred.name, safeQuantity, ingred.unit);
            ingredients.push(newIngred);
        }
        const newRecipe: RecipeDoc = {
            _id: freshID(),
            owner: requestedBy,
            title: recipeData.title,
            description: recipeData.description,
            ingredients: ingredients,
            link,
            isCopy: false,
            isPublic: false,
        };

        await this.recipes.insertOne(newRecipe);

        return { recipe: newRecipe };
    }


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

    // Helper to recursively parse value in ingredient
    private parseValue = (val: string): number => {
        val = val.trim();
        if (val.includes("/")) {
            const [num, den] = val.split("/");
            return parseFloat(num) / parseFloat(den);
        }
        return parseFloat(val);
    };

    // Note: Is returning a list of IngredientDocs allowed (composite type)?
    /**
     * parseIngredients(requestedBy: User, recipe: Recipe, ingredientsText: String)
     *
     * **requires** this `recipe` has an owner who is this `requestedBy`
     *  ingredientsText must be line separated and in the format: "quantity, unit, name" for each line
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
            const quantityString = parts[0].trim();
            let quantity: number;

            // 1. Check for Range (e.g. "1/4 - 1/2" or "1-2")
            if (quantityString.includes("-")) {
                const [minStr, maxStr] = quantityString.split("-");

                // We parse both sides individually using the helper
                const min = this.parseValue(minStr);
                const max = this.parseValue(maxStr);

                if (isNaN(min) || isNaN(max)) {
                    return { error: `Invalid quantity range: ${quantityString}` };
                }

                // Average the range for a single numeric value
                quantity = (min + max) / 2;
            }
            // 2. Check for Single Fraction (e.g. "1/2")
            else {
                quantity = this.parseValue(quantityString);
            }
            // 3. Final NaN Check
            if (isNaN(quantity)) {
                return { error: `Invalid quantity: ${parts[0]}` };
            }

            const unit = parts[1].trim();
            const name = parts[2].trim();
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
            updateFields.name = newName.toLowerCase();
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
     * _findRecipeByIngredient(ingredients: List<String>, requestedBy?: User): (recipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` that have these `ingredients` (which are the food names) and are either public or owned by `requestedBy`, where the initial recipes are the ones that have the most ingredients in these `ingredients`
     */
    async _findRecipeByIngredient({ ingredients, requestedBy }: { ingredients: string[], requestedBy?: User }): Promise<Array<{ recipes: RecipeDoc[] } | { error: string }>> {
        if (!ingredients || ingredients.length === 0) {
            return [{ error: "Ingredients list cannot be empty." }];
        }

        const regexIngredients = ingredients.map(ing => new RegExp(ing, 'i'));
        // Normalize input for the loop
        const normalizedInputs = ingredients.map((i) => i.toLowerCase());

        // Build visibility filter: public OR owned by requestedBy
        const visibilityFilter = requestedBy
            ? { $or: [{ isPublic: true }, { owner: requestedBy }] }
            : { isPublic: true };

        // Fetch recipes matching visibility filter, then filter in JavaScript to find ANY ingredient matches
        const allRecipes = await this.recipes.find(visibilityFilter).toArray();


        // Score recipes by matching ingredients
        const scored = allRecipes
            .map((recipe: RecipeDoc) => {
                // Count how many UNIQUE search terms are matched (not ingredient instances)
                const matchedTerms = new Set<string>();
                recipe.ingredients.forEach((ingred: IngredientDoc) => {
                    const dbIngredientName = ingred.name.toLowerCase();
                    normalizedInputs.forEach(input => {
                        if (dbIngredientName.includes(input)) {
                            matchedTerms.add(input);
                        }
                    });
                });

                // Primary sort: number of unique search terms matched
                const uniqueTermsMatched = matchedTerms.size;

                // Secondary sort: total number of ingredient instances matched
                const totalInstancesMatched = recipe.ingredients.filter((ingred: IngredientDoc) => {
                    const dbIngredientName = ingred.name.toLowerCase();
                    return normalizedInputs.some(input => dbIngredientName.includes(input));
                }).length;

                return { recipe, uniqueTermsMatched, totalInstancesMatched };
            })
            .filter((entry) => entry.uniqueTermsMatched > 0);

        scored.slice(0, 5).forEach(entry => {
            console.log(`  - "${entry.recipe.title}": uniqueTerms = ${entry.uniqueTermsMatched}, totalInstances = ${entry.totalInstancesMatched}, ingredients = ${entry.recipe.ingredients.map(i => i.name).join(', ')}`);
        });

        if (scored.length === 0) {
            return [{ recipes: [] }];
        }

        // Sort by unique terms matched (descending), then by total instances (descending)
        scored.sort((a, b) => {
            if (b.uniqueTermsMatched !== a.uniqueTermsMatched) {
                return b.uniqueTermsMatched - a.uniqueTermsMatched;
            }
            return b.totalInstancesMatched - a.totalInstancesMatched;
        });

        scored.slice(0, 5).forEach(entry => {
            console.log(`  - "${entry.recipe.title}": uniqueTerms = ${entry.uniqueTermsMatched}, totalInstances = ${entry.totalInstancesMatched}, ingredients = ${entry.recipe.ingredients.map(i => i.name).join(', ')}`);
        });

        const sortedRecipes = scored.map((entry) => entry.recipe);

        return [{ recipes: sortedRecipes }];
    }

    /**
     * _search(query: String, requestedBy?: User): (recipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` that have this `query` in this `title` and are either public or owned by `requestedBy`
     */
    async _search({ query, requestedBy }: { query: string, requestedBy?: User }): Promise<Array<{ recipes: RecipeDoc[] } | { error: string }>> {
        if (!query || query.trim().length === 0) {
            return [{ error: "Query shouldn't be empty" }];
        }

        const normalized = query.toLowerCase();

        // Build visibility filter: public OR owned by requestedBy
        const visibilityFilter = requestedBy
            ? { $or: [{ isPublic: true }, { owner: requestedBy }] }
            : { isPublic: true };

        const matchingRecipes: RecipeDoc[] = await this.recipes
            .find({
                title: { $regex: normalized, $options: "i" },
                ...visibilityFilter,
            })
            .toArray();

        return [{ recipes: matchingRecipes }];
    }

    /**
     * _findRecipeByIngredientWithinRecipes(ingredients: List<String>, recipes: List<Recipe>): (newRecipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` in these `recipes` that have these `ingredients` (which are the food names), where the initial recipes are the ones that have the most ingredients in these `ingredients`
     */
    async _findRecipeByIngredientWithinRecipes({ ingredients, recipes }: { ingredients: string[], recipes: Recipe[] }): Promise<Array<{ recipes: Recipe[] } | { error: string }>> {
        if (!ingredients || ingredients.length === 0) {
            return [{ error: "Ingredients list cannot be empty." }];
        }

        if (!recipes || recipes.length === 0) {
            return [{ recipes: [] }];
        }

        const normalizedInputs = ingredients.map((i) => i.toLowerCase());

        const recipeDocs: RecipeDoc[] = await this.recipes
            .find({ _id: { $in: recipes } })
            .toArray();

        const scored = recipeDocs
            .map((recipe: RecipeDoc) => {
                const matchCount = recipe.ingredients.filter((ingred: IngredientDoc) => {
                    const dbIngredientName = ingred.name.toLowerCase();
                    // Use substring matching to find any combination
                    return normalizedInputs.some(input => dbIngredientName.includes(input));
                }).length;
                return { recipe, matchCount };
            })
            .filter((entry: { recipe: RecipeDoc; matchCount: number }) => entry.matchCount > 0); // keep recipes that actually have ingredients

        // none found
        if (scored.length === 0) {
            return [{ recipes: [] }];
        }
        scored.sort((a: { recipe: RecipeDoc; matchCount: number }, b: { recipe: RecipeDoc; matchCount: number }) => b.matchCount - a.matchCount);
        const sortedRecipeIds = scored.map((entry: { recipe: RecipeDoc; matchCount: number }) => entry.recipe._id);

        return [{ recipes: sortedRecipeIds }];
    }

    /**
     * _searchWithinRecipes(query: String, recipes: List<Recipe>): (newRecipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` in these `recipes` that have this `query` in this `title`
     */
    async _searchWithinRecipes({ query, recipes }: { query: string, recipes: Recipe[] }): Promise<Array<{ recipes: Recipe[] } | { error: string }>> {
        if (!query || query.trim().length === 0) {
            return [{ error: "Query shouldn't be empty" }];
        }

        if (!recipes || recipes.length === 0) {
            return [{ recipes: [] }]; // no recipes to filter
        }

        const normalized = query.toLowerCase();

        const matchingRecipes: RecipeDoc[] = await this.recipes
            .find({
                _id: { $in: recipes },
                title: { $regex: normalized, $options: "i" },
            })
            .toArray();

        const recipeIds: Recipe[] = matchingRecipes.map((r) => r._id);

        return [{ recipes: recipeIds }];
    }

    /**
     * _filterIngredientAndSearch(query: String, ingredients: List<String>): (recipes: List<Recipe>)
     *
     * **effects** returns all the `Recipes` that have this `query` in this `title` and these `ingredients`, where the initial recipes are the ones that have the most ingredients in these `ingredients`
     */
    // async _filterIngredientAndSearch({ query, ingredients }: { query: string, ingredients: string[] }): Promise<Array<{ recipes: Recipe[] } | { error: string }>> {
    //     if (!query || query.trim().length === 0) {
    //         return [{ error: "Query cannot be empty." }];
    //     }
    //     if (!ingredients || ingredients.length === 0) {
    //         return [{ error: "Ingredients list cannot be empty." }];
    //     }

    //     const normalizedQuery = query.toLowerCase();
    //     const normalizedIngredients = ingredients.map((i) => i.toLowerCase());

    //     const regexIngredients = ingredients.map(ing => new RegExp(ing, 'i'));

    //     // Fetch all recipes that match the query in the title
    //     const recipeDocs: RecipeDoc[] = await this.recipes
    //         .find({
    //             title: { $regex: normalizedQuery, $options: "i" },
    //             "ingredients.name": { $in: regexIngredients }
    //         })
    //         .toArray();

    //     const scored = recipeDocs
    //         .map((recipe) => {
    //             const matchCount = recipe.ingredients.filter((ingred) =>
    //                 normalizedIngredients.includes(ingred.name.toLowerCase())
    //             ).length;

    //             return { recipe, matchCount };
    //         })
    //         .filter((entry) => entry.matchCount > 0); // keep only matches

    //     scored.sort((a, b) => b.matchCount - a.matchCount);

    //     const sortedIds: Recipe[] = scored.map((entry) => entry.recipe._id);

    //     return [{ recipes: sortedIds }];
    // }
    async _filterIngredientAndSearch({ query, ingredients, requestedBy }: { query: string, ingredients: string[], requestedBy?: User }): Promise<Array<{ recipes: RecipeDoc[] } | { error: string }>> {
        if (!query || query.trim().length === 0) return [{ error: "Query cannot be empty." }];
        if (!ingredients || ingredients.length === 0) return [{ error: "Ingredients list cannot be empty." }];

        const regexIngredients = ingredients.map(ing => new RegExp(ing, 'i'));
        const normalizedInputs = ingredients.map((i) => i.toLowerCase());

        // Build visibility filter: public OR owned by requestedBy
        const visibilityFilter = requestedBy
            ? { $or: [{ isPublic: true }, { owner: requestedBy }] }
            : { isPublic: true };

        // Fetch recipes matching title and visibility, then filter ingredients in JavaScript
        const recipeDocs: RecipeDoc[] = await this.recipes
            .find({
                title: { $regex: query.toLowerCase(), $options: "i" },
                ...visibilityFilter,
            })
            .toArray();

        const scored = recipeDocs
            .map((recipe) => {
                const matchCount = recipe.ingredients.filter((ingred) => {
                    const dbIngredientName = ingred.name.toLowerCase();

                    // FIX: Partial match check
                    return normalizedInputs.some(input => dbIngredientName.includes(input));
                }).length;

                return { recipe, matchCount };
            })
            .filter((entry) => entry.matchCount > 0);

        scored.sort((a, b) => b.matchCount - a.matchCount);

        const sortedRecipes = scored.map((entry) => entry.recipe);

        return [{ recipes: sortedRecipes }];
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
    }): Promise<Array<{ recipes: Recipe[] } | { error: string }>> {
        if (!query || query.trim().length === 0) {
            return [{ error: "Query cannot be empty." }];
        }
        if (!ingredients || ingredients.length === 0) {
            return [{ error: "Ingredients list cannot be empty." }];
        }
        if (!recipes || recipes.length === 0) {
            return [{ recipes: [] }]; // nothing to filter
        }

        const normalizedQuery = query.toLowerCase();
        const normalizedInputs = ingredients.map((i) => i.toLowerCase());

        const regexIngredients = ingredients.map(ing => new RegExp(ing, 'i'));


        // Fetch recipes matching title and ID, then filter ingredients in JavaScript
        const recipeDocs: RecipeDoc[] = await this.recipes
            .find({
                _id: { $in: recipes },
                title: { $regex: normalizedQuery, $options: "i" }
            })
            .toArray();

        // Score recipes by number of matching ingredients
        const scored = recipeDocs
            .map((recipe) => {
                const matchCount = recipe.ingredients.filter((ingred) => {
                    const dbIngredientName = ingred.name.toLowerCase();
                    // Use substring matching to find any combination
                    return normalizedInputs.some(input => dbIngredientName.includes(input));
                }).length;
                return { recipe, matchCount };
            })
            .filter((entry) => entry.matchCount > 0);

        // Sort by matchCount descending
        scored.sort((a, b) => b.matchCount - a.matchCount);

        const sortedIds: Recipe[] = scored.map((entry) => entry.recipe._id);

        return [{ recipes: sortedIds }];
    }

    /**
     * _getRecipe(owner: User, title: String): (recipes: List<Recipe>)
     *
     * **requires** this `owner` and this `title` exists in the set of `Recipes`
     *
     * **effects** returns the `Recipe`s associated with this `owner` and this `title`
     */
    async _getRecipe({ owner, title }: { owner: User, title: string }): Promise<Array<{ recipes: RecipeDoc[] } | { error: string }>> {
        if (!owner) {
            return [{ error: "Owner ID is required." }];
        }
        if (!title || title.trim().length === 0) {
            return [{ error: "Title cannot be empty." }];
        }


        const recipes = await this.recipes.find({ owner, title }).toArray();
        if (recipes.length === 0) {
            return [{ error: `Recipe with title "${title}" for this owner not found.` }];
        }

        return [{ recipes }];
    }

    /**
     * _getAllRecipes(owner: User): (recipes: List<Recipe>)
     *
     * **requires** this `owner` exists in the set of `Recipes`
     *
     * **effects** returns all the `Recipe`s associated with this `owner`
     */
    async _getAllRecipes({ owner }: { owner: User }): Promise<Array<{ recipe: RecipeDoc } | { error: string }>> {
        if (!owner) {
            return [{ error: "Owner ID is required." }];
        }

        try {
            const recipes: RecipeDoc[] = await this.recipes
                .find({ owner })
                .toArray();
            if (recipes.length === 0) {
                return [];
            }

            return recipes.map(r => ({ recipe: r }));

        } catch (err: any) {
            return [{ error: `Failed to fetch recipes: ${err.message}` }];
        }
    }

    /**
     * _getAllRecipesGlobal(): (recipes: List<Recipe>)
     *
     * **requires** true
     *
     * **effects** returns all `Recipe`s that are public
     */
    async _getAllRecipesGlobal(): Promise<Array<{ recipe: RecipeDoc } | { error: string }>> {
        try {
            const recipes: RecipeDoc[] = await this.recipes
                .find({ isPublic: true })
                .toArray();

            return recipes.map(r => ({ recipe: r }));

        } catch (err: any) {
            return [{ error: `Failed to fetch recipes: ${err.message}` }];
        }
    }

    // _getIngredients()
    /**
     * _getIngredients(): (ingredients: List<Ingredient>)
     *
     * **effects** returns all the `Ingredient`s in the set of `Ingredient`s
     */
    async _getIngredients({ }: Empty): Promise<Array<{ ingredients: IngredientDoc[] } | { error: string }>> {
        try {
            const ingredients: IngredientDoc[] = await this.ingredients
                .find({})
                .toArray();
            return [{ ingredients }];
        } catch (err: any) {
            return [{ error: `Failed to fetch ingredients: ${err.message}` }];
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
    async _getIngredientsByName({ name }: { name: string }): Promise<Array<{ ingredients: IngredientDoc[] } | { error: string }>> {
        if (!name || name.trim().length === 0) {
            return [{ error: "Ingredient name cannot be empty." }];
        }
        try {
            const ingredients: IngredientDoc[] = await this.ingredients
                .find({ name: { $regex: name, $options: "i" } })
                .toArray();
            return [{ ingredients }];
        } catch (err: any) {
            return [{ error: `Failed to fetch ingredients by name: ${err.message}` }];
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
    async _scaleIngredients({ recipe, scaleFactor }: { recipe: Recipe, scaleFactor: number }): Promise<Array<{ ingredients: IngredientDoc[] } | { error: string }>> {
        const existing = await this.recipes.findOne({ _id: recipe });
        if (!existing) {
            return [{ error: "Recipe not found" }];
        }

        if (scaleFactor <= 0) {
            return [{ error: `Scale factor ${scaleFactor} should be a positive number` }];
        }
        const scaledIngredients: IngredientDoc[] = existing.ingredients.map((ingred) => ({
            ...ingred,
            quantity: ingred.quantity * scaleFactor,
        }));
        return [{ ingredients: scaledIngredients }];
    }
}
