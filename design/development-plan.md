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
| Incorporating feedback/insights from user testing    | Everyone <br>(individual tasks TBD)                            |
**Updated notes**: We changed the roles of who implemented what concepts and tests in the backend. Everyone worked on the frontend on Monday and Tuesday. 

## Key Risks and Changes

**Alpha deadline**: 
Changes: 
- We split the User concept into a Profile and User concept to fit their two separate purposes. 
- We planned to use the parseFromLink feature in beta, because we weren't sure if we had time to incorporate it for the alpha checkpoint, but we ended up finishing it for this deadline!
- We added more actions to the Recipe concept so that it can search recipes by the list of ingredients, and search by the list of ingredients AND a list of recipes (so it's an additional step of filtering)
- We added an additional query in the Recipes that gets all the recipes in the entire database to load in the Home page. 

**Functional Design deadline**: 
Our primary risk is time and scope. There is a chance that we will be unable to implement all of our features by the deadline, especially if unexpected difficulties arise. As such, we have divided our features into core features and additional features. Core features are the minimum set of features that are necessary to be implemented for our app to fulfill its purpose. These are all planned to be submitted by the alpha deadline. If any delays occur, then we should be able to push back the schedule and have them submitted by the beta deadline, at the expense of an additional feature. 

Another risk that we're encountering is the feasibility of automating the import recipe process from other platforms. If analyzing external posts/videos for ingredients/recipe names is infeasible, then we plan to fall back on requiring manual importing of the data. 

