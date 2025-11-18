Design summary: A summary of the overall design: how the concepts work together to solve the problem; how the design addresses any concerns that your ethics analysis raised; which issues remain unclear.

# Design Summary

## Concepts

We currently have 4 major concepts: **User**, **Collecting**, **Recipe**, and **Ingredient**. 

**User** handles the account setup and management—when users visit the site, they'll be able to view global recipes, but won't be able to do anything else until creating an account and/or signing in. 

**Recipe** is the core recipe representation—it mainly handles CRUD operations, and allows users to define various elements of the recipe, including the title, ingredients, and optionally, a link to the original recipe (if imported from another platform), and a description. It also keeps track of ownership

**Collecting** handles collections of recipes, which can be used to share recipes with other users, or to group one's own recipes. This also is mostly CRUD operations, and includes elements such as the collection name, owner, members, and items within the collection. Once a user creates a recipe, or finds a recipe that they like, they can add it to various collections in order to share it with other users. 

Additional functionality that comes from interactions between the concepts includes: 
- Searching for recipes - this requires both the Collecting and Recipe concepts. Users can find recipes within or between collections by searching/filtering on the recipe name or the ingredients in the recipe. 
- 

## Ethical analysis

Our design addresses the concerns raised in our ethical analysis in the following ways:
1. Crediting original creators - rather than importing entire recipes from other apps, we only import the name, ingredients, and link. To follow the recipe, users will still have to go to the original recipe creator's post, thus giving them credit and avoiding any loss of revenue (for content creators)
2. Cooking Autonomy - instead of only allowing users to choose from an existing set of recipes, users can create their own, and can even copy and edit other recipes on the platform, allowing them to adapt the available recipes to their own needs and wants. 
3. Macroeconomic Uncertainty - our current design does not explicitly address macroeconomic uncertainty or the cost of recipes. However, if the app fulfills its core purpose of preventing food waste, then this alone will benefit users economically, since they are getting better utilization of food for their money. 