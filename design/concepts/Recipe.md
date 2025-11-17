
# Recipe

* **concept**: Recipe [User, Ingredient]
* **purpose**: represent the essential information needed to prepare a dish
* **principle**: a user adds a recipe with the name of the dish, the ingredients needed, and the list of instructions or link to the recipe; this recipe can then be viewed by the user, and possibly other users
* **state**
  * a set of `Recipes` with
    * an `owner` `User`
    * a `title` `String`
    * an `ingredients` `List\<Ingredient\>`
    * an optional `link` `String`
    * an optional `description` String
    * an `isCopy` `boolean`
* **actions**
  * `createRecipe(owner: User, title: String, link?: String, description?: String)`
	  * **requires** this `owner` doesn't already have a Recipe with this `title`
	  * **effects** creates a new `Recipe` with this `owner`, this `title`, and (this `link` or this `description`)
  * `deleteRecipe(owner: User, title: String)`
	  * **requires** this `owner` has a `Recipe` with this `title`
	  * **effects** removes the `Recipe` with this `owner` and this `title`
  * `addIngredient(owner: User, title: String, ingredient: Ingredient)`
	  * **requires** this `owner` has a `Recipe` with this `title`, this `ingredient` isn't already in that `Recipe`
	  * **effects** adds this `ingredient` to the `Recipe` with this `owner` and this `title`
  * `removeIngredient(owner: User, title: String, ingredient: Ingredient)`
	  * **requires** this `owner`, this `title`, and this `ingredient` exists in the set of `Recipes`
	  * **effects** removes this `ingredient` from the `Recipe` with this `owner` and this `title`
  * `setLink(owner: User, title: String, link: String)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`
	* **effects** sets the `link` for the `Recipe` with this `owner` and this `title` to this `link`
  * `removeLink(owner: User, title: String)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`, this `Recipe` has a `description`
	* **effects** removes the `link` associated with this `Recipe`
  * `setDescription(owner: User, title: String, description: String)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`
	* **effects** sets the `description` for the `Recipe` with this `owner` and this `title` to this `description`
  * `removeDescription(owner: User, title: String)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`, this `Recipe` has a `link`
	* **effects** removes the `description` with associated with this `Recipe`
  * `setRecipeCopy(owner: User, title: String, isCopy: boolean)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`
	* **effects** sets the `isCopy` in the `Recipe` with this `owner` and this `title` to this `isCopy`
* **queries**
  * `_findRecipeByIngredient(ingredient: Ingredient): (recipes: List<Recipe>)`
	* **effects** returns all the `Recipes` that have this `ingredient`
  * `_getRecipe(owner: User, title: String): (recipe: Recipe)`
	* **requires** this `owner` and this `title` exists in the set of `Recipes`
	* **effects** returns the `Recipe` associated with this `owner` and this `title`
  * `_getAllRecipes(owner: User): (recipes: List<Recipe>)`
	* **requires** this `owner` exists in the set of `Recipes`
	* **effects** returns all the `Recipe`s associated with this `owner`


# Notes

- `isCopy` is a flag to determine whether a Recipe is a copy of another recipe (from a different user) 