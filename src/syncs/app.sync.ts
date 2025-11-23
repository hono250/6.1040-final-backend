// src/syncs/app.sync.ts
import { actions, Frames, Sync } from "@engine";
import { User, Recipe, Collecting, Requesting } from "@concepts";

// ============================================================================
// USER AUTHENTICATION & ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Logout
 * Request: POST /api/User/logout { token }
 * Response: {}
 */
export const LogoutRequest: Sync = ({ request, token }) => ({
  when: actions([
    Requesting.request,
    { path: "User/logout", token },
    { request }
  ]),
  then: actions([
    User.logout, { token }
  ]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "User/logout" }, { request }],
    [User.logout, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const LogoutError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "User/logout" }, { request }],
    [User.logout, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Update Display Name
 * Request: POST /api/User/updateDisplayName { token, displayName }
 * Response: {}
 */
export const UpdateDisplayNameRequest: Sync = ({ 
  request, token, displayName, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "User/updateDisplayName", token, displayName },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    User.updateDisplayName, { user: userId, displayName }
  ]),
});

export const UpdateDisplayNameResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "User/updateDisplayName" }, { request }],
    [User.updateDisplayName, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const UpdateDisplayNameError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "User/updateDisplayName" }, { request }],
    [User.updateDisplayName, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Update Password
 * Request: POST /api/User/updatePassword { token, oldPassword, newPassword }
 * Response: {}
 */
export const UpdatePasswordRequest: Sync = ({ 
  request, token, oldPassword, newPassword, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "User/updatePassword", token, oldPassword, newPassword },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    User.updatePassword, { user: userId, oldPassword, newPassword }
  ]),
});

export const UpdatePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "User/updatePassword" }, { request }],
    [User.updatePassword, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const UpdatePasswordError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "User/updatePassword" }, { request }],
    [User.updatePassword, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Delete Account
 * Request: POST /api/User/deleteAccount { token }
 * Response: {}
 * 
 * NOTE: This only deletes the user account and sessions.
 * Frontend MUST handle cleanup of recipes and collections BEFORE calling this.
 */
export const DeleteAccountRequest: Sync = ({ 
  request, token, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "User/deleteAccount", token },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    User.deleteUser, { user: userId }
  ]),
});

export const DeleteAccountResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "User/deleteAccount" }, { request }],
    [User.deleteUser, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "User/deleteAccount" }, { request }],
    [User.deleteUser, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

// ============================================================================
// RECIPE MANAGEMENT
// ============================================================================

/**
 * Create Recipe (authenticated)
 * Request: POST /api/Recipe/createRecipe { token, title, link?, description?, image? }
 * Response: { recipe }
 */
export const CreateRecipeRequest: Sync = ({ 
  request, token, title, link, description, image, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/createRecipe", token, title, link, description, image },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.createRecipe, { owner: userId, title, link, description }
  ]),
});

export const CreateRecipeResponse: Sync = ({ request, recipe }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/createRecipe" }, { request }],
    [Recipe.createRecipe, {}, { recipe }]
  ),
  then: actions([
    Requesting.respond, { request, recipe }
  ]),
});

export const CreateRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/createRecipe" }, { request }],
    [Recipe.createRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Delete Recipe (authenticated, removes from all collections)
 * Request: POST /api/Recipe/deleteRecipe { token, recipe }
 * Response: {}
 */
export const DeleteRecipeRequest: Sync = ({ 
  request, token, recipe, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/deleteRecipe", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions(
    [Collecting.removeItemSystemwide, { item: recipe }],
    [Recipe.deleteRecipe, { requestedBy: userId, recipe }]
  ),
});

export const DeleteRecipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/deleteRecipe" }, { request }],
    [Recipe.deleteRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/deleteRecipe" }, { request }],
    [Recipe.deleteRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Copy Recipe (authenticated)
 * Request: POST /api/Recipe/copyRecipe { token, originalRecipe }
 * Response: { recipe }
 */
export const CopyRecipeRequest: Sync = ({ 
  request, token, originalRecipe, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/copyRecipe", token, recipe: originalRecipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.copyRecipe, { requestedBy: userId, recipe: originalRecipe }
  ]),
});

export const CopyRecipeResponse: Sync = ({ request, recipe }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/copyRecipe" }, { request }],
    [Recipe.copyRecipe, {}, { recipe }]
  ),
  then: actions([
    Requesting.respond, { request, recipe }
  ]),
});

export const CopyRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/copyRecipe" }, { request }],
    [Recipe.copyRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Add Ingredient to Recipe
 * Request: POST /api/Recipe/addIngredientToRecipe { token, recipe, ingredient }
 * Response: {}
 */
export const AddIngredientToRecipeRequest: Sync = ({ 
  request, token, recipe, ingredient, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/addIngredientToRecipe", token, recipe, ingredient },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.addIngredientToRecipe, { requestedBy: userId, recipe, ingredient }
  ]),
});

export const AddIngredientToRecipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/addIngredientToRecipe" }, { request }],
    [Recipe.addIngredientToRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const AddIngredientToRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/addIngredientToRecipe" }, { request }],
    [Recipe.addIngredientToRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Remove Ingredient from Recipe
 * Request: POST /api/Recipe/removeIngredientFromRecipe { token, recipe, ingredient }
 * Response: {}
 */
export const RemoveIngredientFromRecipeRequest: Sync = ({ 
  request, token, recipe, ingredient, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/removeIngredientFromRecipe", token, recipe, ingredient },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.removeIngredientFromRecipe, { requestedBy: userId, recipe, ingredient }
  ]),
});

export const RemoveIngredientFromRecipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/removeIngredientFromRecipe" }, { request }],
    [Recipe.removeIngredientFromRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveIngredientFromRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/removeIngredientFromRecipe" }, { request }],
    [Recipe.removeIngredientFromRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Set Recipe Link
 * Request: POST /api/Recipe/setLink { token, recipe, link }
 * Response: {}
 */
export const SetRecipeLinkRequest: Sync = ({ 
  request, token, recipe, link, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/setLink", token, recipe, link },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setLink, { requestedBy: userId, recipe, link }
  ]),
});

export const SetRecipeLinkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/setLink" }, { request }],
    [Recipe.setLink, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeLinkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/setLink" }, { request }],
    [Recipe.setLink, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Remove Recipe Link
 * Request: POST /api/Recipe/removeLink { token, recipe }
 * Response: {}
 */
export const RemoveRecipeLinkRequest: Sync = ({ 
  request, token, recipe, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/removeLink", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.removeLink, { requestedBy: userId, recipe }
  ]),
});

export const RemoveRecipeLinkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/removeLink" }, { request }],
    [Recipe.removeLink, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveRecipeLinkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/removeLink" }, { request }],
    [Recipe.removeLink, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Set Recipe Description
 * Request: POST /api/Recipe/setDescription { token, recipe, description }
 * Response: {}
 */
export const SetRecipeDescriptionRequest: Sync = ({ 
  request, token, recipe, description, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/setDescription", token, recipe, description },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setDescription, { requestedBy: userId, recipe, description }
  ]),
});

export const SetRecipeDescriptionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/setDescription" }, { request }],
    [Recipe.setDescription, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeDescriptionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/setDescription" }, { request }],
    [Recipe.setDescription, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Remove Recipe Description
 * Request: POST /api/Recipe/removeDescription { token, recipe }
 * Response: {}
 */
export const RemoveRecipeDescriptionRequest: Sync = ({ 
  request, token, recipe, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/removeDescription", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.removeDescription, { requestedBy: userId, recipe }
  ]),
});

export const RemoveRecipeDescriptionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/removeDescription" }, { request }],
    [Recipe.removeDescription, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveRecipeDescriptionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/removeDescription" }, { request }],
    [Recipe.removeDescription, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Set Recipe Image
 * Request: POST /api/Recipe/setImage { token, recipe, image }
 * Response: {}
 */
export const SetRecipeImageRequest: Sync = ({ 
  request, token, recipe, image, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/setImage", token, recipe, image },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setImage, { requestedBy: userId, recipe, image }
  ]),
});

export const SetRecipeImageResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/setImage" }, { request }],
    [Recipe.setImage, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeImageError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/setImage" }, { request }],
    [Recipe.setImage, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Delete Recipe Image
 * Request: POST /api/Recipe/deleteImage { token, recipe }
 * Response: {}
 */
export const DeleteRecipeImageRequest: Sync = ({ 
  request, token, recipe, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/deleteImage", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.deleteImage, { requestedBy: userId, recipe }
  ]),
});

export const DeleteRecipeImageResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/deleteImage" }, { request }],
    [Recipe.deleteImage, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteRecipeImageError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/deleteImage" }, { request }],
    [Recipe.deleteImage, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Parse Ingredients
 * Request: POST /api/Recipe/parseIngredients { token, recipe, ingredientsText }
 * Response: { ingredients }
 */
export const ParseIngredientsRequest: Sync = ({ 
  request, token, recipe, ingredientsText, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/parseIngredients", token, recipe, ingredientsText },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.parseIngredients, { requestedBy: userId, recipe, ingredientsText }
  ]),
});

export const ParseIngredientsResponse: Sync = ({ request, ingredients }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/parseIngredients" }, { request }],
    [Recipe.parseIngredients, {}, { ingredients }]
  ),
  then: actions([
    Requesting.respond, { request, ingredients }
  ]),
});

export const ParseIngredientsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/parseIngredients" }, { request }],
    [Recipe.parseIngredients, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Create Ingredient
 * Request: POST /api/Recipe/createIngredient { token, name, quantity, unit }
 * Response: { ingredient }
 */
export const CreateIngredientRequest: Sync = ({ 
  request, token, name, quantity, unit, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/createIngredient", token, name, quantity, unit },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.createIngredient, { name, quantity, unit }
  ]),
});

export const CreateIngredientResponse: Sync = ({ request, ingredient }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/createIngredient" }, { request }],
    [Recipe.createIngredient, {}, { ingredient }]
  ),
  then: actions([
    Requesting.respond, { request, ingredient }
  ]),
});

export const CreateIngredientError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/createIngredient" }, { request }],
    [Recipe.createIngredient, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Delete Ingredient
 * Request: POST /api/Recipe/deleteIngredient { token, ingredient }
 * Response: {}
 */
export const DeleteIngredientRequest: Sync = ({ 
  request, token, ingredient, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/deleteIngredient", token, ingredient },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.deleteIngredient, { ingredient }
  ]),
});

export const DeleteIngredientResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/deleteIngredient" }, { request }],
    [Recipe.deleteIngredient, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteIngredientError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/deleteIngredient" }, { request }],
    [Recipe.deleteIngredient, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Edit Ingredient
 * Request: POST /api/Recipe/editIngredient { token, inputIngredient, newName?, newQuantity?, newUnit? }
 * Response: {}
 */
export const EditIngredientRequest: Sync = ({ 
  request, token, inputIngredient, newName, newQuantity, newUnit, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/editIngredient", token, inputIngredient, newName, newQuantity, newUnit },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.editIngredient, { inputIngredient, newName, newQuantity, newUnit }
  ]),
});

export const EditIngredientResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/editIngredient" }, { request }],
    [Recipe.editIngredient, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const EditIngredientError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Recipe/editIngredient" }, { request }],
    [Recipe.editIngredient, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Get All My Recipes (authenticated)
 * Request: POST /api/Recipe/getAllMyRecipes { token }
 * Response: { recipes }
 */
export const GetAllMyRecipesRequest: Sync = ({ 
  request, token, userId, recipes 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/getAllMyRecipes", token },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    frames = await frames.query(Recipe._getAllRecipes, { owner: userId }, { recipes });
    return frames;
  },
  then: actions([
    Requesting.respond, { request, recipes }
  ]),
});

//response and error handling for GellAllRecipes happens in the request sync

/**
 * View Recipe (authenticated - includes collection status)
 * Request: POST /api/Recipe/viewRecipe { token, owner, title }
 * Response: { recipes, collectionsWithStatus }
 */
/**
 * View Recipe (authenticated - includes collection status)
 * Request: POST /api/Recipe/viewRecipe { token, owner, title }
 * Response: { recipes, collectionsWithStatus }
 */
export const ViewRecipeAuthenticatedRequest: Sync = ({ 
  request, token, owner, title, userId, recipes, collectionsWithStatus 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/viewRecipe", token, owner, title },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    
    // Authenticate
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    
    // Get the recipe
    frames = await frames.query(Recipe._getRecipe, { owner, title }, { recipes });
    
    // Check if query returned error
    const recipesResult = frames[0][recipes] as any;
    if (!recipesResult || (recipesResult.error)) {
      return new Frames({ ...originalFrame, [recipes]: [], error: recipesResult?.error || "Recipe not found" });
    }
    
    // Extract recipe ID
    const recipeId = recipesResult[0]?._id;
    if (!recipeId) {
      return new Frames({ ...originalFrame, [recipes]: [], [collectionsWithStatus]: [] });
    }
    
    // Get collections with item status
    frames = await frames.query(
      Collecting._getCollectionsWithItemStatus,
      { user: userId, item: recipeId },
      { collectionsWithStatus }
    );
    
    return frames;
  },
  then: actions([
    Requesting.respond, { request, recipes, collectionsWithStatus }
  ]),
});

// Responde and error handling for ViewRecipeAuthenticated handled in request sync

// ============================================================================
// COLLECTION MANAGEMENT
// ============================================================================

/**
 * Create Collection (authenticated)
 * Request: POST /api/Collecting/create { token, name }
 * Response: { collection }
 */
export const CreateCollectionRequest: Sync = ({ 
  request, token, name, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/create", token, name },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.create, { owner: userId, name }
  ]),
});

export const CreateCollectionResponse: Sync = ({ request, collection }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/create" }, { request }],
    [Collecting.create, {}, { collection }]
  ),
  then: actions([
    Requesting.respond, { request, collection }
  ]),
});

export const CreateCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/create" }, { request }],
    [Collecting.create, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Delete Collection (authenticated)
 * Request: POST /api/Collecting/delete { token, collection }
 * Response: {}
 */
export const DeleteCollectionRequest: Sync = ({ 
  request, token, collection, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/delete", token, collection },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.delete, { collection, requestedBy: userId }
  ]),
});

export const DeleteCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/delete" }, { request }],
    [Collecting.delete, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/delete" }, { request }],
    [Collecting.delete, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Rename Collection (authenticated)
 * Request: POST /api/Collecting/rename { token, collection, newName }
 * Response: {}
 */
export const RenameCollectionRequest: Sync = ({ 
  request, token, collection, newName, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/rename", token, collection, newName },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.rename, { collection, newName, requestedBy: userId }
  ]),
});

export const RenameCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/rename" }, { request }],
    [Collecting.rename, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RenameCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/rename" }, { request }],
    [Collecting.rename, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Get My Collections (authenticated)
 * Request: POST /api/Collecting/getMyCollections { token }
 * Response: { collections }
 */
export const GetMyCollectionsRequest: Sync = ({ 
  request, token, userId,collections 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/getMyCollections", token },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    frames = await frames.query(Collecting._getCollections, { user: userId }, { collections });
    return frames;
  },
  then: actions([
    Requesting.respond, { request, collections }
  ]),
});

/**
 * View Collection (get items and members)
 * Request: POST /api/Collecting/viewCollection { token, collection }
 * Response: { items, members }
 */
export const ViewCollectionRequest: Sync = ({ 
  request, token, collection, userId, items, members 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/viewCollection", token, collection },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    frames = await frames.query(Collecting._getItems, { collection, requestingUser: userId }, { items });
    frames = await frames.query(Collecting._getMembers, { collection }, { members });
    return frames;
  },
  then: actions([
    Requesting.respond, { request, items, members }
  ]),
});

/**
 * Add Item to Collection (authenticated)
 * Request: POST /api/Collecting/addItem { token, collection, item }
 * Response: {}
 */
export const AddItemToCollectionRequest: Sync = ({ 
  request, token, collection, item, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/addItem", token, collection, item },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.addItem, { collection, item, addedBy: userId }
  ]),
});

export const AddItemToCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/addItem" }, { request }],
    [Collecting.addItem, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const AddItemToCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/addItem" }, { request }],
    [Collecting.addItem, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Remove Item from Collection (authenticated)
 * Request: POST /api/Collecting/removeItem { token, collection, item }
 * Response: {}
 */
export const RemoveItemFromCollectionRequest: Sync = ({ 
  request, token, collection, item, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/removeItem", token, collection, item },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.removeItem, { collection, item, removedBy: userId }
  ]),
});

export const RemoveItemFromCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/removeItem" }, { request }],
    [Collecting.removeItem, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveItemFromCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/removeItem" }, { request }],
    [Collecting.removeItem, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Add Member to Collection (authenticated, by email)
 * Request: POST /api/Collecting/addMember { token, collection, email }
 * Response: {}
 */
export const AddMemberToCollectionRequest: Sync = ({ 
  request, token, collection, email, currentUserId, newUserId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/addMember", token, collection, email },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId: currentUserId });
    frames = await frames.query(User._getUserByEmail, { email }, { userId: newUserId });
    return frames;
  },
  then: actions([
    Collecting.addMember, { collection, user: newUserId, addedBy: currentUserId }
  ]),
});

export const AddMemberToCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/addMember" }, { request }],
    [Collecting.addMember, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const AddMemberToCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/addMember" }, { request }],
    [Collecting.addMember, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Remove Member from Collection (authenticated, owner only)
 * Request: POST /api/Collecting/removeMember { token, collection, user }
 * Response: {}
 */
export const RemoveMemberFromCollectionRequest: Sync = ({ 
  request, token, collection, user, currentUserId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/removeMember", token, collection, user },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId: currentUserId });
    return frames;
  },
  then: actions([
    Collecting.removeMember, { collection, user, requestedBy: currentUserId }
  ]),
});

export const RemoveMemberFromCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/removeMember" }, { request }],
    [Collecting.removeMember, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveMemberFromCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/removeMember" }, { request }],
    [Collecting.removeMember, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Leave Collection (authenticated, members can leave voluntarily)
 * Request: POST /api/Collecting/leave { token, collection }
 * Response: {}
 */
export const LeaveCollectionRequest: Sync = ({ 
  request, token, collection, userId 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Collecting/leave", token, collection },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.leave, { collection, user: userId }
  ]),
});

export const LeaveCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/leave" }, { request }],
    [Collecting.leave, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const LeaveCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "Collecting/leave" }, { request }],
    [Collecting.leave, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

// ============================================================================
// 4. SEARCH
// ============================================================================

/**
 * Search Global (Unauthenticated - uses public pass-through queries)
 * Frontend calls /api/Recipe/_filterIngredientAndSearch directly - no sync needed
 */

/**
 * Search in My Collections (authenticated)
 * Request: POST /api/Recipe/searchMyCollections { token, ingredientNames, titleQuery }
 * Response: { recipes }
 */
export const SearchMyCollectionsRequest: Sync = ({ 
  request, token, ingredientNames, titleQuery, userId, collection, items, results 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/searchMyCollections", token, ingredientNames, titleQuery },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    
    // Authenticate
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    
    // Get all collections user is in
    frames = await frames.query(Collecting._getCollections, { user: userId}, { collection });

    // query returns frames where each frame might have the collection data
    // Collecting._getCollections returns Array<CollectionDoc[]>, so we need to extract
    const collectionsArray = frames[0] as any; // access first frame
    
    if (!collectionsArray || frames.length === 0) {
      // User has no collections
      return new Frames({ ...originalFrame, [results]: [] });
    }
    
    // Get items from each collection (this creates multiple frames, one per collection)
    frames = await frames.query(Collecting._getItems, { collection, requestingUser: userId }, { items });
    
    // Collect all unique items across collections
    const allItems = new Set();
    frames.forEach(frame => {
      const itemsList = frame[items];
      if (itemsList && Array.isArray(itemsList)) {
        itemsList.forEach(item => allItems.add(item));
      }
    });
    
    if (allItems.size === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }
    
    // Search within these recipes
    const scopedRecipes = Array.from(allItems);
    const searchFrame = { ...originalFrame, [userId]: frames[0][userId] };
    
    frames = new Frames(searchFrame);
    frames = await frames.query(
      Recipe._filterIngredientAndSearchWithinRecipes,
      { recipes: scopedRecipes, query: titleQuery, ingredients: ingredientNames },
      { recipes: results }
    );
    
    return frames;
  },
  then: actions([
    Requesting.respond, { request, results }
  ]),
});

/**
 * Search Global Authenticated (includes awareness of user's collections)
 * Request: POST /api/Recipe/searchGlobalAuthenticated { token, ingredientNames, titleQuery }
 * Response: { recipes }
 */
export const SearchGlobalAuthenticatedRequest: Sync = ({ 
  request, token, ingredientNames, titleQuery, userId, results 
}) => ({
  when: actions([
    Requesting.request,
    { path: "Recipe/searchGlobalAuthenticated", token, ingredientNames, titleQuery },
    { request }
  ]),
  where: async (frames) => {
    // Authenticate
    frames = await frames.query(User._getSessionUser, { token }, { userId });
    
    // Search globally
    frames = await frames.query(
      Recipe._filterIngredientAndSearch,
      { query: titleQuery, ingredients: ingredientNames },
      { recipes: results }
    );
    
    return frames;
  },
  then: actions([
    Requesting.respond, { request, results }
  ]),
});