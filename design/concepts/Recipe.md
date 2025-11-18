
# Recipe

* **concept**: Recipe [User, Ingredient]
* **purpose**: represent the essential information needed to prepare a dish
* **principle**: a user adds a recipe with the name of the dish, the ingredients needed, and the list of instructions or link to the recipe; this recipe can then be viewed by the user, and possibly other users
* **state**
  * a set of `Recipes` with
    * an `owner` `User`
    * a `title` `String`
    * an `ingredients` `List\<Ingredient\>`
    * an optional `image` String
    * an optional `link` `String`
    * an optional `description` String
    * an `isCopy` `flag`
  * a set of `Ingredients` with
    * a `quantity` `number`
    * a `name` `String`
* **actions**
  * `createRecipe(owner: User, title: String, link?: String, description?: String): (recipe: Recipe)`
	  * **requires** this `owner` doesn't already have a Recipe with this `title`
	  * **effects** creates a new `Recipe` with this `owner`, this `title`, and (this `link` or this `description`), returns this recipe
  * `deleteRecipe(requestedBy: User, recipe: Recipe)`
	  * **requires** this `recipe` has an owner who is this `requestedBy`
	  * **effects** removes this `recipe` from the set of `Recipe`s
  * `addIngredientToRecipe(requestedBy: User, recipe: Recipe, ingredient: Ingredient)`
	  * **requires** this `recipe` has an owner who is this `requestedBy`, this `ingredient` isn't already in that `Recipe`
	  * **effects** adds this `ingredient` to the `Recipe` with this `owner` and this `title`
  * `removeIngredientFromRecipe(requestedBy: User, recipe: Recipe, ingredient: Ingredient)`
	  * **requires** this `recipe` has an owner who is this `requestedBy`, this `ingredient` exists in this `recipe`
	  * **effects** removes this `ingredient` from this `recipe`
  * `setLink(requestedBy: User, recipe: Recipe, link: String)`
	* **requires** this `recipe` has an owner who is this `requestedBy`
	* **effects** sets the `link` for this `recipe` to this `link`
  * `removeLink(requestedBy: User, recipe: Recipe)`
	* **requires** this `recipe` has an owner who is this `requestedBy`, this `recipe` has a `description`
	* **effects** removes the `link` from this `recipe`
  * `setDescription(requestedBy: User, recipe: Recipe, description: String)`
	* **requires** this `recipe` has an owner who is this `requestedBy'
	* **effects** sets the `description` for this `recipe`
  * `removeDescription(requestedBy: User, recipe: Recipe)`
	* **requires** this `recipe` has an owner who is this `requestedBy`, this `Recipe` has a `link`
	* **effects** removes the `description` with associated with this `recipe`
  * `setRecipeCopy(requestedBy: User, recipe: Recipe, isCopy: flag)`
	* **requires** this `recipe` has an owner who is this `requestedBy`
	* **effects** sets the `isCopy` in this `recipe` to this `isCopy`
  * `setImage(requestedBy: User, recipe: Recipe, image: String)`
	* **requires** this `recipe` has an owner who is this `requestedBy`
	* **effects** sets the `image` in this `recipe` to this `image`
  * `deleteImage(requestedBy: User, recipe: Recipe)`
	* **requires** this `recipe` has an owner who is this `requestedBy`, image exists in this `recipe`
	* **effects** removes the `image` in this recipe
  * `parseFromLink(owner: User, link: String, llm: GeminiLLM): (recipe: Recipe)`
	* **requires** this `link` is valid and accessible
	* **effects** uses this `llm` to parse this `link` to add a recipe with this `owner`, will add information to this `title`, this `ingredients`, and this `link`, returns this recipe
  * `copyRecipe(requestedBy: User, recipe: Recipe): (recipe: Recipe)`
	* **requires** this `recipe` exists in the set of `Recipe`s
	* **effects** creates a new `recipe` with the same fields as this `recipe`, but this `owner` is now this `requestedBy`, changes `isCopy` of this `recipe` and the new `recipe` to True, returns this new recipe
  * `parseIngredients(requestedBy: User, recipe: Recipe, ingredientsText: String)`
	* **requires** this `recipe` has an owner who is this `requestedBy`
	* **effects** parses this `ingredientsText` into individual `Ingredient`s as part of this `recipe`'s `ingredients`
  * `addIngredient(quantity: number, foodName: String): (ingredient: Ingredient)`
	* **requires** this `quantity` and `foodName` isn't already in the set of `Ingredient`s
	* **effects** creates a new `Ingredient` with this `quantity` and `foodName`, returns this ingredient
  * `deleteIngredient(ingredient: Ingredient)`
	* **requires** this `ingredient` exists in the set of `Ingredient`s
	* **effects** removes this `ingredient` from the set of `Ingredient`s

* **queries**
  * `_findRecipeByIngredient(ingredient: Ingredient): (recipes: List<Recipe>)`
	* **effects** returns all the `Recipes` that have this `ingredient`
  * `_search(query: String): (recipes: List<Recipe>)`
	* **effects** returns all the `Recipes` that have this `query` in this `title`
  * `_getRecipe(owner: User, title: String): (recipe: Recipe)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`
	* **effects** returns the `Recipe` associated with this `owner` and this `title`
  * `_getAllRecipes(owner: User): (recipes: List<Recipe>)`
	* **requires** this `owner` exists in the set of `Recipes`
	* **effects** returns all the `Recipe`s associated with this `owner`

# Notes

- `isCopy` is a flag to determine whether a Recipe is a copy of another recipe (from a different user) 