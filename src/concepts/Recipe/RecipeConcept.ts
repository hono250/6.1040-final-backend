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
}
