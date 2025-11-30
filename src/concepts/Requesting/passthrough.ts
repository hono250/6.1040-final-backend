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
  "/api/UserAuthentication/login": "public - authenticate existing users",

  // Recipe - public queries for browsing recipes
  "/api/Recipe/_getRecipe": "public - view any recipe by owner and title",
  "/api/Recipe/_search": "public - search recipes by title",
  "/api/Recipe/_findRecipeByIngredient": "public - search recipes by ingredients",
  "/api/Recipe/_filterIngredientAndSearch": "public - search recipes by title and ingredients",
  "/api/Recipe/_scaleIngredients": "public - scale recipe ingredients for viewing",
  "/api/Recipe/_getIngredients": "public - list all ingredients for search autocomplete",
  "/api/Recipe/_getIngredientsByName": "public - search ingredients by name for",
  "/api/Recipe/_getAllRecipesGlobal": "public - view all recipes from any owner"
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
  // User - all operations (concept only manages user IDs)
  "/api/User/createUser",
  "/api/User/deleteUser",
  "/api/User/_isUser",
  "/api/User/_getAllUsers",

  // UserAuthentication - authenticated operations
  "/api/UserAuthentication/createAuth",
  "/api/UserAuthentication/logout",
  "/api/UserAuthentication/authenticate",
  "/api/UserAuthentication/updatePassword",
  "/api/UserAuthentication/deleteAuth",
  "/api/UserAuthentication/_getByEmail",
  "/api/UserAuthentication/_getSessionUser",

  // Profile - all operations
  "/api/Profile/createProfile",
  "/api/Profile/updateDisplayName",
  "/api/Profile/deleteProfile",
  "/api/Profile/_getProfile",

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
  "/api/Recipe/setRecipePublic",
  "/api/Recipe/copyRecipe",
  "/api/Recipe/parseIngredients",
  "/api/Recipe/createIngredient",
  "/api/Recipe/deleteIngredient",
  "/api/Recipe/editIngredient",
  "/api/Recipe/parseFromLink",
  "/api/Recipe/_findRecipeByIngredientWithinRecipes",
  "/api/Recipe/_searchWithinRecipes",
  "/api/Recipe/_filterIngredientAndSearchWithinRecipes",
  "/api/Recipe/_getAllRecipes",


  // Recipe - private helper methods (not for external use)
  "/api/Recipe/isValidLink",
  "/api/Recipe/checkRecipeAndOwner",
  "/api/Recipe/createIngredientHelper",
  "/api/Recipe/generateLLMPrompt",
  "/api/Recipe/validateLLMResponse",

  // Collecting - all need authentication
  "/api/Collecting/create",
  "/api/Collecting/addMember",
  "/api/Collecting/removeMember",
  "/api/Collecting/leave",
  "/api/Collecting/addItem",
  "/api/Collecting/removeItem",
  "/api/Collecting/rename",
  "/api/Collecting/delete",
  "/api/Collecting/_getItems",
  "/api/Collecting/_getMembers",
  "/api/Collecting/_getCollections",
  "/api/Collecting/_getCollectionsWithItemStatus",

  //Collecting - internal system actions (used by syncs, not exposed to frontend)
  "/api/Collecting/leaveAllCollections",
  "/api/Collecting/removeItemSystemwide",

];
