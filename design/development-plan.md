# Development plan

## Feature checkpoints

| Feature                     | Delivered by which stage         |
| --------------------------- | -------------------------------- |
| Backend Concepts + Syncs    | 11/22 // 11/23 morning           |
| Saving Recipes              | alpha checkpoint                 |
| Account creation/management | Alpha checkpoint                 |
| Ingredient search           | Alpha checkpoint                 |
| Shared recipe collections   | Alpha checkpoint                 |
| Scaling recipes             | Beta checkpoint                  |
| Recipe organization (tags)  | Beta checkpoint                  |
| Ingredient Substitutions    | Final submission, if time allows |
| Progress Tracking           | Final submission, if time allows |
**Updated notes**: We changed to finish the backend before the frontend and connecting the two pieces. We ended up finishing the backend where we would have finished the frontend pages. Over the weekend, we worked on some parts of the frontend and updated with functional design feedback. We primarily finished the frontend-backend pieces on Monday and Tuesday before the alpha checkpoint. 
## Task management

| Task                                                 | Assigned To                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Create initial backend skeleton                      | Christine                                                      |
| Create initial frontend skeleton, connect to backend | Christine                                                      |
| Implement concepts in backend                        | Recipe: Christine + Ryan<br>User: Eyob<br>Collecting: Honorine |
| Implement concept syncs in backend                   | Honorine                                                       |
| Add tests for concepts in backend                    | Recipe: Christine + Ryan<br>User: Eyob<br>Collecting: Honorine |
| Implement frontend functionality                     | Everyone                                                       |
| Stylize + improve frontend usability                 | Everyone sits together to find problems / improvements         |
| User Testing                                         | Everyone                                                       |
| Incorporating feedback/insights from user testing    | Everyone                          |
**Updated notes**: We changed the roles of who implemented what concepts and tests in the backend. Everyone worked on the frontend on Monday and Tuesday. 

## Key Risks and Changes

**Beta deadline**

Adjustments:
- We focused on ingredient-based search rather than full pantry tracking (receipt scanning and expiration tracking deferred based on TA guidance and peer feedback)
- We added ingredient chips, hardcoded by category (instead of dynamically generated from recipe data). We think including all ingredients could overwhelm users since they would still need to search through long lists. We've added added a commony wasted ingredients section to emphasize our goal of reducing food waste.
- We implemented private vs public recipes with `isPublic` flag (added privacy controls beyond initial plan)
- We made `_getProfile` publically accessible for collection member display names

Features deferred to final:
- Scaling recipes
- Recipe organization/tags  
- Ingredient substitutions
- Progress tracking

**Alpha deadline**: 
Changes: 
- We split the User concept into a Profile and User concept to fit their two separate purposes. 
- We planned to use the `parseFromLink` feature in beta, because we weren't sure if we had time to incorporate it for the alpha checkpoint, but we ended up finishing it for this deadline!
- We added more actions to the Recipe concept so that it can search recipes by the list of ingredients, and search by the list of ingredients AND a list of recipes (so it's an additional step of filtering)
- We added an additional query in the Recipes that gets all the recipes in the entire database to load in the Home page.
- We added a `leaveAllCollections` action to the Collecting concept to allow seamless account deletion.
- We updated syncs to work with the new User/Profile/UserAuthentication concept split and new actions

**Functional Design deadline**: 
Our primary risk is time and scope. There is a chance that we will be unable to implement all of our features by the deadline, especially if unexpected difficulties arise. As such, we have divided our features into core features and additional features. Core features are the minimum set of features that are necessary to be implemented for our app to fulfill its purpose. These are all planned to be submitted by the alpha deadline. If any delays occur, then we should be able to push back the schedule and have them submitted by the beta deadline, at the expense of an additional feature. 

Another risk that we're encountering is the feasibility of automating the import recipe process from other platforms. If analyzing external posts/videos for ingredients/recipe names is infeasible, then we plan to fall back on requiring manual importing of the data. 

## Adjustments based on peer feedback/critique

- Is there a sustained user need for this app? The goal is to address the problem of food waste, and we're looking at this primarily with ingredient-based search with the bonus and needed saving recipes feature. This combination also helps with users that want to cook with ingredients they have from public recipes, but also recipes that they might have saved from all over the Internet (which most apps don't have)
- Make the goal of reducing waste more clear in the UI design: we added a new landing page that explains why food waste matters and how our app helps address this goal/problem as well