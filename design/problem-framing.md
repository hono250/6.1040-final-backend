

# Problem Framing

## Domain


Food Recipes: I enjoy cooking and discovering new recipes online. The internet has made it easier to access, save, and share recipes from around the world, with many features available to make these processes more seamless and efficient. 
 

## Problem

Food waste: I often find that I have a random set of ingredients that I don't know what to do with. Perhaps it's leftover raw ingredients from another recipe, or I haven't gone to the grocery store in a while and only have non-perishables, but I often end up with many items that either sit in the fridge/freezer forever, and end up expiring and getting thrown out. I feel that there should be a way to utilize this food rather than wasting it.

## Evidence

- [87% of American households report that they waste edible food the week prior to survey](https://www.mitre.org/news-insights/news-release/mitre-gallup-survey-finds-us-households-waste-62-cups-edible-food-every): The average household wastes about 6 cups of food every week, and only 3 in 10 make use of their leftovers.
- [30-40% of America's food supply comes from food waste](https://www.fda.gov/food/consumers/food-loss-and-waste): The United States could be using the edible food from food waste (food that could still be used and eaten) to save money and food, and even feed other people in need.
- [Some people avoid buying ingredients (and following a recipe) because they fear they won't be able to use the ingredient in other ways](https://www.reddit.com/r/Cooking/comments/wlrycc/do_you_guys_hesitate_to_buy_certain_ingredients/): Redditors have discussed hesitation in buying ingredients that they might not use more than once for a recipe because it will expire or they won't find use for it, and one has even talked about using the leftover ingredients to discover new recipes.
- [Frustrations over grocery store quantities leading to food waste](https://www.reddit.com/r/Cooking/comments/uw6n3o/anyone_else_frustrated_by_quantities_sold_in/): Reddit post with over 2.5k upvotes complaining about and seeking remedies for food waste as a result of grocery store quantities being more than what a single recipe uses.
- [People share their concern about overbuying ingredients when they are mealprepping](https://www.facebook.com/groups/1441881406149047/posts/2059614934375688/): Even though meal prepping and meal planning is a good way to make use of ingredients you can only buy in "bulk" (using a whole onion at once instead of saving it until the next time you *might* use it), some people still face the problem of overbuying.

## Comparables

- [Supercook](https://www.supercook.com/): Supercook is useful to find recipes using ingredients a user already has, but you can't submit your own recipes found out of their database and are forced to use what they have.
- [Paprika](https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/): Paprika is a common app used for recipe saving, but it requires a one-time payment to download the software and the user interface isn't ideal. For example, users can't view the ingredients and directions at the same time, or on the same page.
- [Flavorish](https://www.flavorish.ai/blog/save-recipes-from-social-media-with-flavorish): Saves recipes from instagram/TikTok/Youtube with AI extraction, but it focuses on saving only, does not emphasize ingredient-based search and meal recommendations based on one's data (saved recipes, whether user liked them after trying them etc).
- [Mealime](https://www.mealime.com/): Meal planning with some ingredient considerations but does not focus on user's saved recipes.
- [Deglaze](https://apps.apple.com/us/app/deglaze-cooking-simplified/id6443578246): Recipe saving/sharing + grocery list app that lets users add or import recipes from social media, make grocery lists from those recipes, and share them. Only available on iPhones, and doesn't address making/discovering recipes based on what ingredients the user already has.
- [cooked](https://cooked.wiki/): uses AI to translate recipes (from anywhere) to simpler text + standard format, which can be stored and shared with friends or publicly. Also supports recipe -> grocery list translation. Doesn't address user's existing ingredients or (re-)discovery of recipes.
- [Nikki Gets Fit advocates for ingredient prepping over meal prepping](https://www.facebook.com/groups/1441881406149047/posts/2059614934375688/?comment_id=2059680674369114): There is a YouTuber who suggests ingredient-prepping to avoid overbuying and wasting food because you can find recipes for the same ingredients and use those recipes instead of following a bunch of recipes and having various ingredients leftover (that could potentially be wasted).

## Features

- **Ingredient-Based Recipe Search**: input ingredients you have / want to use for a recipe and get recipes with zero or minimal missing ingredients
- **Emphasizing Recipes Based on Inventory**: prioritize the recipes that the user has the most ingredients
- **Saving Recipes**: save recipes to use from all sources (even Instagram)
- **Recipe organization**: Tag and categorize a recipe to enable search through collection.
- **Progress tracking**: mark recipes as "already made" to see what you've accomplished (maybe include answers to questions like "how much did you like the recipe you made?"). Track cooking history and (when you made it + notes)
- **Scaling Recipes**: scale recipes by a custom amount so that user can follow it for meal prepping rather than for one meal
- **Recipe sharing**: users can upload recipes for others to see on the app, and can consider others’ (public) recipes when searching for ingredient uses.

- **Substitutions**: allow users to specify preferred substitutions, which can be considered when searching recipes based on existing ingredients (e.g. allow recipes with chicken to show up when the user only has tofu, if they specify the substitution)


## Ethical Analysis

### 1. Indirect Stakeholders - Recipe Creators

**Observation:** Saving recipes from other apps may discredit recipe creators off of the app, if the recipes are being shared on our app. This can even lead to material loss for recipe content creators.

**Design Response:** Rather than translating recipes entirely into our app (bypassing the original content), link to the original content and only extrapolate base information (like ingredients, recipe name), as well as the creator to provide attribution.

### 2. Time: Adaptation and Lifestyle Changes

**Observation:** The app could support positive lifestyle changes (cooking more, reducing waste) but might indirectly encourage negative behaviours such as obsessing over ingredient tracking that creates stress instead of reducing it.

**Design Response:** Avoid guilt inducing language about waste. Include features that celebrate using ingredients (cooking streaks, recipes completed) instead of shaming users for expired ingredients. Maybe make ingredient tracking optional.

### 3. Pervasiveness: Macro Economic Uncertainty

**Observation:** [In recent years the cost of groceries has increased faster than inflation](https://www.ers.usda.gov/data-products/food-price-outlook/summary-findings) which makes food waste more costly than it may have been in previous years.

**Design Response:** Emphasize savings associated with avoiding food waste. This could look like adding ingredient cost awareness into our recommendation algorithm.

### 4. Time: Sustained Friendships

**Observation:** Cooking and recipes often create and follow strong interpersonal bonds. This can be seen in multi-generational family recipes, the sharing of food between friends, etc.

**Design Response:** To emphasize the social/interpersonal aspect, we could allow users to join groups to share recipes in, or add support for joint ingredient consideration.

### 5. Stakeholders: Variation in Human Ability

**Observation:** Someone who needs to use many substitutions (due to allergens, religious beliefs, vegan/vegetarianism, etc) may not be able to find recipes based on their ingredients if substitutions are not considered by the system.

**Design Response:** Allow users to specify substitutions, and consider substitutions when performing ingredient-matching.

### 6. Value: Cooking Autonomy for Direct Stakeholders

**Observation:** Sometimes, there might be an illusion of autonomy in cooking because [stakeholders need the right ingredients and knowledge for what food is healthy](https://www.scielo.br/j/csp/a/yGCRBBcKMsh39nHc8yMQtrJ/?format=pdf&lang=en). The actual cooking might also require a higher cooking skill or interest.

**Design Response:** The feature to allow cooks to add in their own recipes contributes to their autonomy because it's something they have already decided to save. It would be helpful to categorize recipes by their difficulty and what meal time it's for (main dish vs snack) so that beginners feel less friction and aren't overwhelmed by what they need to do.
