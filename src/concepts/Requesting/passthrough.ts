/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // User - public authentication
  "/api/User/register": "public - allow new users to sign up",
  "/api/User/login": "public - authenticate existing users",
  
  // Recipe - public queries for browsing recipes
  "/api/Recipe/_getRecipe": "public - view any recipe by owner and title",
  "/api/Recipe/_search": "public - search recipes by title",
  "/api/Recipe/_findRecipeByIngredient": "public - search recipes by ingredients",
  "/api/Recipe/_filterIngredientAndSearch": "public - search recipes by title and ingredients",
  "/api/Recipe/_scaleIngredients": "public - scale recipe ingredients for viewing",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // User - authenticated operations
  "/api/User/logout",
  "/api/User/authenticate",
  "/api/User/updateDisplayName",
  "/api/User/updatePassword",
  "/api/User/deleteUser",
  "/api/User/_getUser",
  "/api/User/_getUserByEmail",
  "/api/User/_getSessionUser",
  "/api/User/_getAllUsers",
  
  // Recipe - all mutations and authenticated queries
  "/api/Recipe/createRecipe",
  "/api/Recipe/deleteRecipe",
  "/api/Recipe/addIngredientToRecipe",
  "/api/Recipe/removeIngredientFromRecipe",
  "/api/Recipe/setLink",
  "/api/Recipe/removeLink",
  "/api/Recipe/setDescription",
  "/api/Recipe/removeDescription",
  "/api/Recipe/setRecipeCopy",
  "/api/Recipe/setImage",
  "/api/Recipe/deleteImage",
  "/api/Recipe/copyRecipe",
  "/api/Recipe/parseIngredients",
  "/api/Recipe/createIngredient",
  "/api/Recipe/deleteIngredient",
  "/api/Recipe/editIngredient",
  "/api/Recipe/_findRecipeByIngredientWithinRecipes",
  "/api/Recipe/_searchWithinRecipes",
  "/api/Recipe/_filterIngredientAndSearchWithinRecipes",
  "/api/Recipe/_getAllRecipes",
  "/api/Recipe/_getIngredients",
  "/api/Recipe/_getIngredientsByName",
  
  // Collecting - all need authentication
  "/api/Collecting/create",
  "/api/Collecting/addMember",
  "/api/Collecting/removeMember",
  "/api/Collecting/leave",
  "/api/Collecting/addItem",
  "/api/Collecting/removeItem",
  "/api/Collecting/rename",
  "/api/Collecting/delete",
  "/api/Collecting/removeItemSystemwide",
  "/api/Collecting/_getItems",
  "/api/Collecting/_getMembers",
  "/api/Collecting/_getCollections",
  "/api/Collecting/_getCollectionsWithItemStatus",
];
