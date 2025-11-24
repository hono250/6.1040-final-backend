# Meeting: November 18, 2025

### Team members present: Ryan, Honorine, Eyob, Christine

### Agenda

1. Progress Report (10 minutes)
2. Ask any questions we have about functional design assignment
3. Discuss future assignment
4. Plans for next meeting

---

### Progress Report

1. Finished problem framing
2. Finished project pitch on Friday
3. Almost done with functional design except for putting the pieces together and making sure User concept is good

---

### Design Changes

1. Updated our problem framing according to feedback \
	a. Locked in on our features (4)

---

### Questions

- How should we filter our recipes in the concept? (or would it be in some for loop in the sync)
	- queries can use composite objects!
	- only require primitives in actions
- Thoughts on our set of concepts (are there too few, are they well-scoped)
	- we initially thought about Profile, User, Authenticate concepts -> changed to merge them together (at the time, the concepts seemed to make sense to be merged)
- Questioned asked about how we're saving recipe
	- manually add in as the fallback
	- specify in our user journey and summary on how to save recipes (with the links we're talking about, redirecting, and how the app is going to redirect to the link with the instructions)
	- how to safeguard against YouTube links and bad links? videos? will we parse videos

---

### Plans & Decisions

- Follow development plan and have a bare bones working app
- will update design summary with our new concept merging (Profile, User, Authenticate) changes
- update development plan to be more clear on what we're doing
- be more specific on user journey and explain the different pathways 
- add a new query to search by title and ingredient; query for title first, then ingredients and compare that list

---

### Additional Notes
- with concepts, think about the purpose and actions that contribute to that purpose
- don't need to include things to functional design for potential features, but if we think we'll actually implement it, we should add it to our functional design to get feedback on it and have a roadmap
- specify what we mean by our ranking system when we rank recipes or return recipes by the amount of ingredients that are fulfilled
	- go through recipes and check >= quantity we have