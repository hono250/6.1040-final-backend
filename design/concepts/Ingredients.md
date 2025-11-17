# Concept: Ingredients

## Purpose
Track ingredient names and quantities

## Principle
After creating an ingredient, users can view or scale the ingredient's quantity

## State
    a set of Ingredients with
      a name String
      an amount Number
      a unit String

## Actions

`createIngredient (name: String, amount: Number, unit: String): (ingredient: Ingredient)`
- **Effect**: Creates and returns a new ingredient

`deleteIngredient (ingredient: Ingredient): ()`
- **Effect**: Removes  `ingredient` from `Ingredients`

`editIngredient (inputIngredient: Ingredient, newName?: String, newAmount?: Number, newUnit?: String): (ingredient: Ingredient)`
- **Effect** modifies `inputIngredient` to have `newName`, `newAmount`, and `newUnit`, leaving omitted fields unmodified 

`_getIngredients (): (ingredients: List<Ingredient>)`
- **Effect**: Returns all ingredients in the set of Ingredients

`_scaleIngredients(inputIngredients: List<Ingredient>, scale: Number): (ingredients: List<Ingredient>)`
- **Requires**: `scale` is a positive number
- **Effect**: creates an ingredient for each ingredient in `inputIngredients` (without adding to set of `Ingredients`) with `amount = amount * scale`, and returns the list of those ingredients. 

## Notes
- Intentionally allows duplicates of the same ingredient, to prevent aliasing/multiple recipes pointing to the same Ingredient, which could be modified
- `editIngredient` does allow for `name`, `amount`, and `unit` to all be undefined. In this case, nothing happens. 
- `_scaleIngredients` does not modify the ingredients, since it is likely many users will want to scale the ingredients when viewing a recipe, which shouldn't change the actual recipe for other users. 