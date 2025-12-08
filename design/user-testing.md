# User Testing

## Task List

| Task name | Instruction | Rationale |
| --- | --- | --- |
| Recipe Search vs Ingredient Search | Can you find a recipe that has “eggs” in it? | testing if the user doesn’t have an account, is that still clear? |
| Manual Create Recipe | Find a recipe online and add it to the website manually. | figure out if they can navigate this (and implicitly force them to create an account) |
| LLM Create Recipe | Find a recipe online and add it to the website using our LLM. | testing how they are adding recipe with manual and llm, and looking at their painpoints |
| Collections Flow | Create a collection and share it to [facilitator's email]
Add your recipe to the collection (if they didn’t already do it in the form)| multi action with create collection, and sharing |
| Specific Collection | Create a birthday collection with foods you’d want your friends to cook for you at your birthday | testing search and collection UI/UX at scale; is it easy when trying to add a lot of recipes to a collection |
| Edit a public recipe | Add pepper to [xyz] recipe | user should be able to copy the recipe , and then edit it once it’s “theirs” | Profile Edits |
| Change your display name | making sure they can navigate to their profile page and edit their user details | |
| Delete collection | Delete your first collection | |
| Delete account | | |
| Delete your account | | |











## User Tester 1

### Summary
The first couple of tasks and collections tasks were intuitive. The user immediately continued without signing in to search for a recipe, so they didn’t feel the need to create an account to use this initial browsing. They chose to use the ingredient based search feature and typed in “egg” rather than searching for the egg chip. The chips seem to be more useful when browsing for inspiration, while typing makes sense when you already know what you’re looking for.

There’s a big pain point in manually creating a recipe due to adding the ingredients. Some recipes have a lot of ingredients, so it’s annoying to properly format the ingredients with a comma separator. They were also confused with what quantity meant, specifically for items like “1 green scallion” – they ended up using “green” as the quantity. There was also an error in parsing fractional ingredients ( ¼ teaspoon -> 1 teaspoon and ¼ - ½ cups  -> 1 cup). On the other hand, the parseFromLink feature works pretty well! It can reasonably add all the ingredients, title, and description to the recipe, which the user found really helpful! There is one parsing quirk where “1-2 teaspoons” converts to 1.5 instead of preserving the range.

I didn’t fully explain the app’s purpose, so the user was initially confused on why descriptions didn’t have the instructions to which I explained that descriptions are not really supposed to give the full recipe especially if they added a link, that they could add the instructions to the description if there is no link. 

The user successfully edited a public recipe after initially struggling to find the edit option. They quickly realized they needed to copy it first. Despite no clear instruction on how to edit a public recipe, it’s easily discoverable!

During the debrief, the user said that they’d actually use cooked! Because it consolidates the key info of a recipe in one place and they don’t have to hunt for ingredients on cluttered recipe pages. Overall, the UI is intuitive and pleasant – the user likes the colors and the fonts but suggests widening the sidebar so it’s easier to use and because there’s empty space on the right side of the screen. They prefer the grid layout display on recipes because it  shows more at once while the  horizontal layout looks nice but isn’t convenient enough and by requiring more scrolling isn’t as user friendly. 

### Opportunities for improvement: 
1) Add a parseFromText action when we manually add a recipe, and the very last fallback is to use the comma separator
- Why is it happening?: The manual add recipe is the fallback/alternative to using parseFromLink in case the LLM doesn’t properly parse in the backend. It takes a long time to add the ingredients to a recipe, and tiring because they can’t directly copy and paste from a recipe, they have to reformat it
- We should add a parseFromText action so that we use an LLM again to try to parse a copied and pasted text of ingredients – this is better than parseFromLink because it doesn’t need to take in a link, but just the block of ingredients so there’s less room for error. 
2) Describe features
- Why is it happening? Some of our features aren’t that intuitive because there’s no explanation for them. The user was initially confused on how to edit a public recipe because there’s only “copy recipe” and “add to collection” in a public recipe’s page
- Add an about us page of some sort that explains the key features and how to use the app
- Add a description in the public recipe’s page that hints to copy a recipe if they would like to modify a public recipe with additional / changes to their ingredients list
3) UI/UX Sidebar Change
- On bigger screens, the home page only shows four columns of recipes with a bit of white space, that isn’t enough to show 5 recipes. This makes the app look incomplete and the sidebar look too small in comparison the wide home page
- Make the sidebar more dynamic so it shows up wider on bigger computer screens. 

## User Tester 2

### Summary

The user performed account actions successfully and without friction. This includes viewing the application without signing in to search for an existing recipe (task 1), creating an account in order to create a recipe (task 2), editing their display name (task 7) and deleting their account (task 9). They indicated that finding and performing these actions was fairly easy and straightforward, but also wished to add a profile picture to their account. 

The user successfully performed recipe actions, albeit with some confusion during recipe creation. During task 4 (LLM recipe creation) they were confused that the imported description didn’t include the steps, and in task 3, lamented that it was difficult to put the recipe instructions in the description, ultimately giving up and just putting a brief description of the recipe. This was the intended use, but the user believed that that the app would not be useful without allowing users to see the recipe instructions. After prompting, they also admitted comma-separated ingredient creation was annoying, but faced no struggles with using it. 

Other recipe actions were performed easily. They quickly figured out ingredient and title based searching in task 2, although they opted to type in the ingredients rather than using ingredient chips, as it was faster for them to enter ingredients manually. They also quickly figured out how to edit a public recipe (task 6) by copying it first. 

The user experienced significant friction and confusion when interacting with collections (tasks 4 and 5). After creation, the user believed the collection was not created, largely because 1) the “recipes in my collection” section did not include their created recipes in their collection, and 2) they could not see or find their collections. After assuring them the collection was created, they eventually found it in the profile page. They also struggled to add recipes to a collection after creation, since it couldn’t be done from the collection page, and to edit members, since it was a different section than view members. They deleted collections (task 8) without issue. 

In additional questioning, the user thought style inconsistencies between the landing page and the rest of the application were strange, and vehemently opposed the horizontal display (calling it “unnatural”), but was otherwise apathetic about styles. They also strongly believed that there should be additional redundant routes to perform common actions, and that collections should be viewable from the home page. 

### Opportunities for improvement:
1) Improve navigation with respect to collections
- The flaw: it is very difficult to find and interact with collections
- Why it’s happening: collection operations are distributed across the whole application. When the user creates a collection, it’s likely on the homepage. When the user wants to see their collection, they need to go to their profile (an abnormal place to store collections). When the user wants to edit the recipes in a collection, they have to go to each recipe page, rather than doing it from inside the collection. When the user wants to edit the collection members, they need to be inside the collection’s page. This is very inconsistent, and there is no one place to look at and interact with a collection.
- Potential solution: have a collections page, which shows all of a user's collections, and is clearly labeled and accessible from the homepage (or even just display a list of collections on the homepage). In a collection page, allow the user to add or remove recipes and add or remove members from the collection. This consolidates the operations so it’s easier to see what can be done and determine where it should be done. 
2) Group and differentiate pages by style

- The flaw: the user has difficulty differentiating between pages, and style is inconsistent between pages

- Why it’s happening: many of our pages look very similar, with unintentional style inconsistencies between them (e.g. logo changing color between some pages, headers being formatted differently). The lack of repetition for repeated functional elements makes it difficult for users to find information that may indicate the current page, and the lack of intentional contrast for differentiating features makes it harder to differentiate between unnecessarily similar elements. 

- Solution: ensure that pages present information with consistent style (e.g. consistently located and styled headers, breadcrumbs, etc), while contrasting styles between elements that should be differentiated (e.g. different backgrounds, layouts, or colors).