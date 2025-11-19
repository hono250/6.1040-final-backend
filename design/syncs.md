# Application Synchronizations

Essential synchronizations showing how concepts coordinate.

## 1. Authentication & Account Setup

### sync deleteAccount
```
when
  Request.deleteAccount(token, password)
  User.authenticate(token): (userId)
  User._getUser(userId): (user)
  User.login(user.email, password): (verified)
  Collecting._getCollections(userId): (collections)
then
  for each collection in collections:
    if collection.owner == userId:
      Collecting.delete(collection, requestedBy: userId)
    else:
      Collecting.leave(collection, userId)
  
  Recipe._getAllRecipes(userId): (recipes)
  for each recipe in recipes:
    Recipe.deleteRecipe(requestedBy: userId, recipe)
  
  User.deleteUser(user)
```

## 2. Recipe Creation & Import

### sync importRecipeFromLink
```
when 
  Request.importRecipe(token, link)
  User.authenticate(token): (userId)
then
  Recipe.parseFromLink(owner: userId, link, llm): (recipe)
```

### sync createRecipeManually
```
when
  Request.createRecipe(token, title, ingredientsText, link, description, image)
  User.authenticate(token): (userId)
then
  Recipe.createRecipe(owner: userId, title, link, description): (recipe)
  if image:
    Recipe.setImage(requestedBy: userId, recipe, image)
  Recipe.parseIngredients(requestedBy: userId, recipe, ingredientsText)
```

### sync copyRecipe
```
when
  Request.copyRecipe(token, originalRecipe)
  User.authenticate(token): (userId)
then
  Recipe.copyRecipe(requestedBy: userId, recipe: originalRecipe): (newRecipe)
```

### sync deleteRecipe
```
when
  Request.deleteRecipe(token, recipe)
  User.authenticate(token): (userId)
then
  Collecting.removeItemSystemwide(item: recipe)
  Recipe.deleteRecipe(requestedBy: userId, recipe)
```

## 3. Search

### sync searchInMyCollections
```
when
  Request.searchMyCollections(token, ingredientNames, titleQuery)
  User.authenticate(token): (userId)
  Collecting._getCollections(userId): (collections)
then
  scopedRecipes = []
  for each collection in collections:
    Collecting._getItems(collection, requestingUser: userId): (items)
    for each item in items:
      if item not in scopedRecipes:
        add item to scopedRecipes
  
  ingredients = []
  for each ingredientName in ingredientNames:
    Recipe.addIngredient(quantity: 0, foodName: ingredientName): (ingredient)
    add ingredient to ingredients
  
  Recipe._filterIngredientAndSearchWithinRecipes(recipes: scopedRecipes, query: titleQuery, ingredients): (results)
  
  return results
```

### sync searchGlobalAuthenticated
```
when
  Request.searchGlobal(token, ingredientNames, titleQuery)
  User.authenticate(token): (userId)
  Collecting._getCollections(userId): (collections)
then
  myCollectionRecipes = []
  for each collection in collections:
    Collecting._getItems(collection, requestingUser: userId): (items)
    for each item in items:
      if item not in myCollectionRecipes:
        add item to myCollectionRecipes
  
  ingredients = []
  for each ingredientName in ingredientNames:
    Recipe.addIngredient(quantity: 0, foodName: ingredientName): (ingredient)
    add ingredient to ingredients
  
  Recipe._filterIngredientAndSearchWithinRecipes(recipes: myCollectionRecipes, query: titleQuery, ingredients): (resultsInMyCollections)
  
  Recipe._filterIngredientAndSearch(query: titleQuery, ingredients): (allGlobalResults)
  
  return {
    inMyCollections: resultsInMyCollections,
    global: allGlobalResults
  }
```

### sync searchGlobalUnauthenticated
```
when
  Request.searchGlobal(ingredientNames, titleQuery)
then
  ingredients = []
  for each ingredientName in ingredientNames:
    Recipe.addIngredient(quantity: 0, foodName: ingredientName): (ingredient)
    add ingredient to ingredients
  
  Recipe._filterIngredientAndSearch(query: titleQuery, ingredients): (results)
  
  return results
```

## 4. Recipe Viewing

### sync viewRecipe
```
when
  Request.viewRecipe(token, owner, title)
  User.authenticate(token): (userId)
  Recipe._getRecipe(owner, title): (recipe)
then
  Collecting._getCollectionsWithItemStatus(user: userId, item: recipe): (collectionsWithStatus)
  
  return {
    recipe: recipe,
    collectionsWithStatus: collectionsWithStatus
  }
```

### sync viewRecipeUnauthenticated
```
when
  Request.viewRecipe(owner, title)
  Recipe._getRecipe(owner, title): (recipe)
then
  return recipe
```

### sync getAllMyRecipes
```
when
  Request.getAllMyRecipes(token)
  User.authenticate(token): (userId)
then
  Recipe._getAllRecipes(userId): (allRecipes)
  
  return allRecipes
```

## 5. Collection Management

### sync getMyCollections
```
when
  Request.getMyCollections(token)
  User.authenticate(token): (userId)
then
  Collecting._getCollections(userId): (collections)
  
  return collections
```

### sync viewCollection
```
when
  Request.viewCollection(token, collection)
  User.authenticate(token): (userId)
  Collecting._getItems(collection, requestingUser: userId): (recipeIds)
  Collecting._getMembers(collection): (memberIds)
then
  recipes = []
  for each recipeId in recipeIds:
    Recipe._getRecipe(owner, title): (recipe)
    add to recipes
  
  members = []
  for each memberId in memberIds:
    User._getUser(memberId): (user)
    add to members
  
  return {recipes, members}
```

### sync addRecipeToCollection
```
when
  Request.addToCollection(token, recipe, collection)
  User.authenticate(token): (userId)
then
  Collecting.addItem(collection, item: recipe, addedBy: userId)
```

### sync removeRecipeFromCollection
```
when
  Request.removeFromCollection(token, recipe, collection)
  User.authenticate(token): (userId)
then
  Collecting.removeItem(collection, item: recipe, removedBy: userId)
```

### sync addMemberToCollection
```
when
  Request.inviteMember(token, collection, email)
  User.authenticate(token): (currentUserId)
  User._getUserByEmail(email): (newUserId)
then
  Collecting.addMember(collection, user: newUserId, addedBy: currentUserId)
```

## Notes

**Recipe Query Signatures Used:**
- `_filterIngredientAndSearch(query, ingredients)` - Searches ALL recipes by title and ingredients
- `_filterIngredientAndSearchWithinRecipes(recipes, query, ingredients)` - Searches WITHIN provided recipes list
- `_getRecipe(owner, title)` - Returns specific recipe
- `_getAllRecipes(owner)` - Returns all recipes created by owner

**Collecting Actions Used:**
- `_getCollections(user)` - Returns all collections user is a member of
- `_getCollectionsWithItemStatus(user, item)` - Only used in viewRecipe for "Add to Collections" UI
- `removeItemSystemwide(item)` - System action for cascade delete when recipe is deleted

**Search Behavior:**
- **Authenticated Global Search** returns two result sets: `inMyCollections` and `global` (may contain duplicates - UI shows the `inMyCollections` results first and gives option for viewing`global`)
- **Unauthenticated Global Search** returns all public recipes
- **My Collections Search** only searches within user's collections

**Orphaned Recipes:**
Recipes created via import/manual creation are not automatically added to any collection. Users can:
- View all their recipes via `getAllMyRecipes` sync (`Recipe._getAllRecipes`)
- Add recipes to collections via `addRecipeToCollection` sync (singular - one collection at a time)
- UI can show "unorganized recipes" (recipes not in any collection) and prompt users to organize them