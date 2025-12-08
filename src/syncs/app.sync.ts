// src/syncs/app.sync.ts
import { actions, Frames, Sync } from "@engine";
import { User, UserAuthentication, Profile, Recipe, Collecting, Requesting } from "@concepts";

// ============================================================================
// USER AUTHENTICATION & ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Register User
 * Request: POST /api/User/register { email, password, displayName }
 * Response: { userId, token }
 */
export const RegisterRequest: Sync = ({
  request, email, password, displayName
}) => ({
  when: actions([
    Requesting.request,
    { path: "/User/register", email, password, displayName },
    { request }
  ]),
  then: actions([
    User.createUser, {}
  ]),
});

export const RegisterCreateAuth: Sync = ({
  request, email, password, displayName, userId
}) => ({
  when: actions(
    [Requesting.request, { path: "/User/register", email, password, displayName }, { request }],
    [User.createUser, {}, { userId }]
  ),
  then: actions(
    [UserAuthentication.createAuth, { userId, email, password }],
    [Profile.createProfile, { userId, displayName }]
  ),
});

export const RegisterLogin: Sync = ({
  request, email, password
}) => ({
  when: actions(
    [Requesting.request, { path: "/User/register", email, password }, { request }],
    [UserAuthentication.createAuth, {}, {}],
    [Profile.createProfile, {}, {}]
  ),
  then: actions([
    UserAuthentication.login, { email, password }
  ]),
});

export const RegisterResponse: Sync = ({ request, token }) => ({
  when: actions(
    [Requesting.request, { path: "/User/register" }, { request }],
    [UserAuthentication.login, {}, { token }]
  ),
  then: actions([
    Requesting.respond, { request, token }
  ]),
});

export const RegisterAuthError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/register" }, { request }],
    [UserAuthentication.createAuth, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

export const RegisterProfileError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/register" }, { request }],
    [Profile.createProfile, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Get Profile (authenticated)
 * Request: POST /api/Profile/getProfile { token }
 * Response: { profile }
 */
export const GetProfileRequest: Sync = ({
  request, token, userId, profile
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/getProfile", token },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    frames = await frames.query(Profile._getProfile, { userId }, { profile });

    // Handle error case
    const profileResult = frames[0][profile] as any;
    if (profileResult?.error) {
      return new Frames({ ...originalFrame, error: profileResult.error });
    }

    return frames;
  },
  then: actions([
    Requesting.respond, { request, profile }
  ]),
});

/**
 * Logout
 * Request: POST /api/UserAuthentication/logout { token }
 * Response: {}
 */
export const LogoutRequest: Sync = ({ request, token }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/logout", token },
    { request }
  ]),
  then: actions([
    UserAuthentication.logout, { token }
  ]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout" }, { request }],
    [UserAuthentication.logout, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const LogoutError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/logout" }, { request }],
    [UserAuthentication.logout, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Update Display Name
 * Request: POST /api/Profile/updateDisplayName { token, displayName }
 * Response: {}
 */
export const UpdateDisplayNameRequest: Sync = ({
  request, token, displayName, userId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/updateDisplayName", token, displayName },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Profile.updateDisplayName, { userId, displayName }
  ]),
});

export const UpdateDisplayNameResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateDisplayName" }, { request }],
    [Profile.updateDisplayName, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const UpdateDisplayNameError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateDisplayName" }, { request }],
    [Profile.updateDisplayName, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Update Password
 * Request: POST /api/UserAuthentication/updatePassword { token, oldPassword, newPassword }
 * Response: {}
 */
export const UpdatePasswordRequest: Sync = ({
  request, token, oldPassword, newPassword, userId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/updatePassword", token, oldPassword, newPassword },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    UserAuthentication.updatePassword, { userId, oldPassword, newPassword }
  ]),
});

export const UpdatePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/updatePassword" }, { request }],
    [UserAuthentication.updatePassword, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const UpdatePasswordError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/updatePassword" }, { request }],
    [UserAuthentication.updatePassword, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Delete Account
 * Request: POST /api/User/deleteAccount { token }
 * Response: {}
 */

/**
 * Delete Account - Step 1: Delete all recipes
 */
export const DeleteAccountDeleteRecipes: Sync = ({
  request, token, userId, recipe, recipeId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/User/deleteAccount", token },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    frames = await frames.query(Recipe._getAllRecipes, { owner: userId }, { recipe });

    return frames.map(($) => ({
      ...$,
      [recipeId]: ($[recipe] as any)._id
    }));
  },
  then: actions(
    [Collecting.removeItemSystemwide, { item: recipe }],
    [Recipe.deleteRecipe, { requestedBy: userId, recipe: recipeId }]
  ),
});

/**
 * Delete Account - Step 2: Leave collections & delete user (all 3 concepts)
 * Fires only when no recipes remain
 */
export const DeleteAccountFinalize: Sync = ({
  request, token, userId, recipe
}) => ({
  when: actions([
    Requesting.request,
    { path: "/User/deleteAccount", token },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    const recipesFrames = await frames.query(Recipe._getAllRecipes, { owner: userId }, { recipe });

    // Only proceed if NO recipes
    if (recipesFrames.length > 0) {
      return new Frames(); // empty - don't fire this sync yet
    }

    return frames;
  },
  then: actions(
    [Collecting.leaveAllCollections, { user: userId }],
    [Profile.deleteProfile, { userId }],
    [UserAuthentication.deleteAuth, { userId }],
    [User.deleteUser, { userId }]
  ),
});

export const DeleteAccountResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/User/deleteAccount" }, { request }],
    [User.deleteUser, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/deleteAccount" }, { request }],
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
 * Request: POST /api/Recipe/createRecipe { token, title, link?, description? }
 * Response: { recipe }
 */
export const CreateRecipeRequest: Sync = ({
  request, token, title, link, description, userId, isPublic
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/createRecipe", token, title, link, description, isPublic },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    // Pass ALL fields to createRecipe, it handles undefined values
    Recipe.createRecipe, { owner: userId, title, link, description, isPublic }
  ]),
});

export const CreateRecipeResponse: Sync = ({ request, recipe }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/createRecipe" }, { request }],
    [Recipe.createRecipe, {}, { recipe }]
  ),
  then: actions([
    Requesting.respond, { request, recipe }
  ]),
});

export const CreateRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/createRecipe" }, { request }],
    [Recipe.createRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Parse Recipe From Link (LLM-powered)
 * Request: POST /api/Recipe/parseFromLink { token, link }
 * Response: { recipe }
 */
export const ParseFromLinkRequest: Sync = ({
  request, token, link, userId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/parseFromLink", token, link },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.parseFromLink, { requestedBy: userId, link }
  ]),
});

export const ParseFromLinkResponse: Sync = ({ request, recipe }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/parseFromLink" }, { request }],
    [Recipe.parseFromLink, {}, { recipe }]
  ),
  then: actions([
    Requesting.respond, { request, recipe }
  ]),
});

export const ParseFromLinkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/parseFromLink" }, { request }],
    [Recipe.parseFromLink, {}, { error }]
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
    { path: "/Recipe/deleteRecipe", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions(
    [Collecting.removeItemSystemwide, { item: recipe }],
    [Recipe.deleteRecipe, { requestedBy: userId, recipe }]
  ),
});

export const DeleteRecipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/deleteRecipe" }, { request }],
    [Recipe.deleteRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/deleteRecipe" }, { request }],
    [Recipe.deleteRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Set Recipe Title
 * Request: POST /api/Recipe/setRecipe { token, recipe, title }
 * Response: {}
 */
export const SetRecipeTitleRequest: Sync = ({
  request, token, userId, recipe, title
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/setRecipe", token, recipe, title },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setRecipe, { requestedBy: userId, recipe, title }
  ]),
});

export const SetRecipeTitleResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setRecipe" }, { request }],
    [Recipe.setRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeTitleError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setRecipe" }, { request }],
    [Recipe.setRecipe, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Copy Recipe (authenticated)
 * Request: POST /api/Recipe/copyRecipe { token, recipe }
 * Response: { recipe }
 */
export const CopyRecipeRequest: Sync = ({
  request, token, originalRecipe, userId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/copyRecipe", token, recipe: originalRecipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.copyRecipe, { requestedBy: userId, recipe: originalRecipe }
  ]),
});

export const CopyRecipeResponse: Sync = ({ request, recipe }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/copyRecipe" }, { request }],
    [Recipe.copyRecipe, {}, { recipe }]
  ),
  then: actions([
    Requesting.respond, { request, recipe }
  ]),
});

export const CopyRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/copyRecipe" }, { request }],
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
    { path: "/Recipe/addIngredientToRecipe", token, recipe, ingredient },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.addIngredientToRecipe, { requestedBy: userId, recipe, ingredient }
  ]),
});

export const AddIngredientToRecipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/addIngredientToRecipe" }, { request }],
    [Recipe.addIngredientToRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const AddIngredientToRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/addIngredientToRecipe" }, { request }],
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
    { path: "/Recipe/removeIngredientFromRecipe", token, recipe, ingredient },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.removeIngredientFromRecipe, { requestedBy: userId, recipe, ingredient }
  ]),
});

export const RemoveIngredientFromRecipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeIngredientFromRecipe" }, { request }],
    [Recipe.removeIngredientFromRecipe, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveIngredientFromRecipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeIngredientFromRecipe" }, { request }],
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
    { path: "/Recipe/setLink", token, recipe, link },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setLink, { requestedBy: userId, recipe, link }
  ]),
});

export const SetRecipeLinkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setLink" }, { request }],
    [Recipe.setLink, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeLinkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setLink" }, { request }],
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
    { path: "/Recipe/removeLink", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.removeLink, { requestedBy: userId, recipe }
  ]),
});

export const RemoveRecipeLinkResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeLink" }, { request }],
    [Recipe.removeLink, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveRecipeLinkError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeLink" }, { request }],
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
    { path: "/Recipe/setDescription", token, recipe, description },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setDescription, { requestedBy: userId, recipe, description }
  ]),
});

export const SetRecipeDescriptionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setDescription" }, { request }],
    [Recipe.setDescription, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeDescriptionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setDescription" }, { request }],
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
    { path: "/Recipe/removeDescription", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.removeDescription, { requestedBy: userId, recipe }
  ]),
});

export const RemoveRecipeDescriptionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeDescription" }, { request }],
    [Recipe.removeDescription, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveRecipeDescriptionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeDescription" }, { request }],
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
    { path: "/Recipe/setImage", token, recipe, image },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setImage, { requestedBy: userId, recipe, image }
  ]),
});

export const SetRecipeImageResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setImage" }, { request }],
    [Recipe.setImage, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipeImageError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setImage" }, { request }],
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
    { path: "/Recipe/deleteImage", token, recipe },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.deleteImage, { requestedBy: userId, recipe }
  ]),
});

export const DeleteRecipeImageResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/deleteImage" }, { request }],
    [Recipe.deleteImage, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteRecipeImageError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/deleteImage" }, { request }],
    [Recipe.deleteImage, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

/**
 * Set Recipe Public
 * Request: POST /api/Recipe/setRecipePublic { token, recipe, isPublic }
 * Response: {}
 */
export const SetRecipePublicRequest: Sync = ({
  request, token, recipe, isPublic, userId
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/setRecipePublic", token, recipe, isPublic },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.setRecipePublic, { requestedBy: userId, recipe, isPublic }
  ]),
});

export const SetRecipePublicResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setPublic" }, { request }],
    [Recipe.setRecipePublic, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const SetRecipePublicError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/setPublic" }, { request }],
    [Recipe.setRecipePublic, {}, { error }]
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
    { path: "/Recipe/parseIngredients", token, recipe, ingredientsText },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.parseIngredients, { requestedBy: userId, recipe, ingredientsText }
  ]),
});

export const ParseIngredientsResponse: Sync = ({ request, ingredients }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/parseIngredients" }, { request }],
    [Recipe.parseIngredients, {}, { ingredients }]
  ),
  then: actions([
    Requesting.respond, { request, ingredients }
  ]),
});

export const ParseIngredientsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/parseIngredients" }, { request }],
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
    { path: "/Recipe/createIngredient", token, name, quantity, unit },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.createIngredient, { name, quantity, unit }
  ]),
});

export const CreateIngredientResponse: Sync = ({ request, ingredient }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/createIngredient" }, { request }],
    [Recipe.createIngredient, {}, { ingredient }]
  ),
  then: actions([
    Requesting.respond, { request, ingredient }
  ]),
});

export const CreateIngredientError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/createIngredient" }, { request }],
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
    { path: "/Recipe/deleteIngredient", token, ingredient },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.deleteIngredient, { ingredient }
  ]),
});

export const DeleteIngredientResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/deleteIngredient" }, { request }],
    [Recipe.deleteIngredient, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteIngredientError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/deleteIngredient" }, { request }],
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
    { path: "/Recipe/editIngredient", token, inputIngredient, newName, newQuantity, newUnit },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Recipe.editIngredient, { inputIngredient, newName, newQuantity, newUnit }
  ]),
});

export const EditIngredientResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/editIngredient" }, { request }],
    [Recipe.editIngredient, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const EditIngredientError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/editIngredient" }, { request }],
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
  request, token, userId, recipe, recipes
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/getAllMyRecipes", token },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    frames = await frames.query(Recipe._getAllRecipes, { owner: userId }, { recipe });

    // Handle empty case
    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        [recipes]: []
      });
    }

    // Collect all recipes into an array for response
    const allRecipes = frames.map((f: any) => f[recipe]);

    return new Frames({
      ...frames[0],
      [recipes]: allRecipes
    });
  },
  then: actions([
    Requesting.respond, { request, recipes }
  ]),
});

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
    { path: "/Recipe/viewRecipe", token, owner, title },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });

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

/**
 * Parse Ingredients From Text
 * Request: POST /api/Recipe/parseIngredientsFromText { ingredientsText }
 * Response: { formattedText }
 */
export const ParseIngredientsFromTextRequest: Sync = ({
  request, ingredientsText, formattedText, llm
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/_parseIngredientsFromText", ingredientsText }, 
  ]),
  where: async (frames) => {
    frames = await frames.query(Recipe._parseIngredientsFromText, { ingredientsText, llm }, { formattedText });
    return frames;
  },
  then: actions([
    Requesting.respond, { request, formattedText }
  ]),
});

export const ParseIngredientsFromTextError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/_parseIngredientsFromText" }, { request }], 
    [Recipe._parseIngredientsFromText, {}, { error }]
  ),
  then: actions([
    Requesting.respond, { request, error }
  ]),
});

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
    { path: "/Collecting/create", token, name },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.create, { owner: userId, name }
  ]),
});

export const CreateCollectionResponse: Sync = ({ request, collection }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/create" }, { request }],
    [Collecting.create, {}, { collection }]
  ),
  then: actions([
    Requesting.respond, { request, collection }
  ]),
});

export const CreateCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/create" }, { request }],
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
    { path: "/Collecting/delete", token, collection },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.delete, { collection, requestedBy: userId }
  ]),
});

export const DeleteCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/delete" }, { request }],
    [Collecting.delete, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const DeleteCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/delete" }, { request }],
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
    { path: "/Collecting/rename", token, collection, newName },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.rename, { collection, newName, requestedBy: userId }
  ]),
});

export const RenameCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/rename" }, { request }],
    [Collecting.rename, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RenameCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/rename" }, { request }],
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
  request, token, userId, collections
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Collecting/getMyCollections", token },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
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
    { path: "/Collecting/viewCollection", token, collection },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });

    // Collection items
    const itemsFrames = await frames.query(Collecting._getItems, { collection, requestingUser: userId }, { items });

    // Collection members
    const membersFrames = await frames.query(Collecting._getMembers, { collection }, { members });

    // Combine results into single frame
    return new Frames({
      ...originalFrame,
      [userId]: frames[0][userId],
      [items]: itemsFrames[0]?.[items] || [],
      [members]: membersFrames[0]?.[members] || []
    });
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
    { path: "/Collecting/addItem", token, collection, item },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.addItem, { collection, item, addedBy: userId }
  ]),
});

export const AddItemToCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/addItem" }, { request }],
    [Collecting.addItem, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const AddItemToCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/addItem" }, { request }],
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
    { path: "/Collecting/removeItem", token, collection, item },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.removeItem, { collection, item, removedBy: userId }
  ]),
});

export const RemoveItemFromCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/removeItem" }, { request }],
    [Collecting.removeItem, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveItemFromCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/removeItem" }, { request }],
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
    { path: "/Collecting/addMember", token, collection, email },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId: currentUserId });
    frames = await frames.query(UserAuthentication._getByEmail, { email }, { userId: newUserId });
    return frames;
  },
  then: actions([
    Collecting.addMember, { collection, user: newUserId, addedBy: currentUserId }
  ]),
});

export const AddMemberToCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/addMember" }, { request }],
    [Collecting.addMember, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const AddMemberToCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/addMember" }, { request }],
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
    { path: "/Collecting/removeMember", token, collection, user },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId: currentUserId });
    return frames;
  },
  then: actions([
    Collecting.removeMember, { collection, user, requestedBy: currentUserId }
  ]),
});

export const RemoveMemberFromCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/removeMember" }, { request }],
    [Collecting.removeMember, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const RemoveMemberFromCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/removeMember" }, { request }],
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
    { path: "/Collecting/leave", token, collection },
    { request }
  ]),
  where: async (frames) => {
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });
    return frames;
  },
  then: actions([
    Collecting.leave, { collection, user: userId }
  ]),
});

export const LeaveCollectionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/leave" }, { request }],
    [Collecting.leave, {}, {}]
  ),
  then: actions([
    Requesting.respond, { request }
  ]),
});

export const LeaveCollectionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Collecting/leave" }, { request }],
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
 * Response: { results }
 */
export const SearchMyCollectionsRequest: Sync = ({
  request, token, ingredientNames, titleQuery, userId, collections, collection, items, results
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/searchMyCollections", token, ingredientNames, titleQuery },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });

    // Get all collections user is in
    frames = await frames.query(Collecting._getCollections, { user: userId }, { collections });

    const collectionsResult = frames[0][collections] as any;

    if (!collectionsResult || !Array.isArray(collectionsResult) || collectionsResult.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // Create frames - one per collection
    const collectionFrames = collectionsResult.map((coll: any) => ({
      ...originalFrame,
      [userId]: frames[0][userId],
      [collection]: coll._id
    }));

    frames = new Frames(...collectionFrames);

    // Get items from each collection
    frames = await frames.query(Collecting._getItems, { collection, requestingUser: userId }, { items });

    // Collect all unique items across collections
    const allItems = new Set();
    frames.forEach((frame: any) => {
      const itemsResult = frame[items];
      if (itemsResult && Array.isArray(itemsResult)) {
        itemsResult.forEach((item: any) => allItems.add(item));
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
 * Search Global Authenticated (flags recipes in user's collections)
 * Request: POST /api/Recipe/searchGlobalAuthenticated { token, ingredientNames, titleQuery }
 * Response: { results }
 */
export const SearchGlobalAuthenticatedRequest: Sync = ({
  request, token, ingredientNames, titleQuery, userId, results, collections, collection, items
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/searchGlobalAuthenticated", token, ingredientNames, titleQuery },
    { request }
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate
    frames = await frames.query(UserAuthentication._getSessionUser, { token }, { userId });

    const authenticatedUserId = frames[0][userId];

    // Search globally
    frames = await frames.query(
      Recipe._filterIngredientAndSearch,
      { query: titleQuery, ingredients: ingredientNames },
      { recipes: results }
    );

    const globalResults = frames[0][results] as any[];

    if (!globalResults || globalResults.length === 0) {
      return new Frames({
        ...originalFrame,
        [userId]: authenticatedUserId,
        [results]: []
      });
    }

    // Get all items in user's collections
    const collectionsFrames = await new Frames({
      ...originalFrame,
      [userId]: authenticatedUserId
    }).query(
      Collecting._getCollections,
      { user: userId },
      { collections }
    );

    const collectionsArray = collectionsFrames[0][collections] as any;
    const userRecipeIds = new Set();

    if (collectionsArray && Array.isArray(collectionsArray) && collectionsArray.length > 0) {
      const collectionFrames = collectionsArray.map((coll: any) => ({
        ...originalFrame,
        [userId]: authenticatedUserId,
        [collection]: coll._id
      }));

      let itemsFrames = new Frames(...collectionFrames);
      itemsFrames = await itemsFrames.query(Collecting._getItems, { collection, requestingUser: userId }, { items });

      itemsFrames.forEach((frame: any) => {
        const itemsList = frame[items];
        if (itemsList && Array.isArray(itemsList)) {
          itemsList.forEach((item: any) => userRecipeIds.add(item.toString()));
        }
      });
    }

    // Flag recipes that are in user's collections
    const flaggedResults = globalResults.map((recipeId: any) => ({
      _id: recipeId,
      inMyCollections: userRecipeIds.has(recipeId.toString())
    }));

    return new Frames({ ...originalFrame, [results]: flaggedResults });
  },
  then: actions([
    Requesting.respond, { request, results }
  ]),
});
