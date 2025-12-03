# Meeting: December 2, 2025

### Team members present: Ryan, Honorine, Eyob, Christine

### Agenda

1. Progress Report (10 minutes)
2. Looking through Design Changes

---

### Progress Report

1. Finished alpha assignment
2. We all looked at the peer critique and feedback and working on addressing the problem more noticeable in the front end of the app
3. tried to make the UI cleaner 
---

### Design Changes

1. query _getProfile is now an exclusion so that we can get the usernames of other profiles when displaying who are the members in the collection
	1. there is a separate getProfile sync that requires to be authenticated that just takes in the token to get the full profile of the current logged in user
2. realized that the frontend for filtering ingredients didn't use backend actions, so added the backend queries to api and used those instead (now they're independent)

---

### Questions

- Compare UI design 
- Compare the food waste CTA / page
	- title is red and green; beware of people who are colorblind so when we're picking colors, be cognizant of that
		- in the wording: tie it back to the app; cooked! allows you to do xyz to drive home the capabilities of cooked addressing the food waste issue
- Beta video: should we focus on the changes or make a new video going over user journey again?
	- will ask profs and get back to us -> 
- Do we need to implement user testing feedback/improvement/flaws or is it just identifying them?
	- we don't have to implement everything, but being able to recognize xyz was where user got stuck in the flow

---

### Plans & Decisions

- add an edit title action in Recipe to allow for recipe changes
- parseFromLink creates a recipe so if users cancel, we should be able to delete the recipe / cancel it
- add manual entry parsing from text so less friction less (use llm)
---

### Additional Notes

- be more direct to signal to the person/user that you're communicating why cooked! over other applications
