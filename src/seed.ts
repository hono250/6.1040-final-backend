/**
 * Seed script for populating database with recipes from TheMealDB API.
 * Only runs once - checks for seed marker before seeding.
 */
import { Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

const MEALDB_BASE = "https://www.themealdb.com/api/json/v1/1";

interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strYoutube?: string;
  strSource?: string;
  [key: string]: string | undefined;
}

interface SeedStatus {
  key: string;
  seededAt: Date;
  recipeCount: number;
  systemUserId: ID;
}

/**
 * Parse quantity and unit from MealDB measure string
 */
function parseMeasure(measure: string): { quantity: number; unit: string } {
  if (!measure || measure.trim() === "") {
    return { quantity: -1, unit: "" };
  }

  const trimmed = measure.trim();
  const match = trimmed.match(/^([\d./\-]+)\s*(.*)$/);
  
  if (match) {
    const quantityStr = match[1];
    const unit = match[2].trim();
    
    let quantity: number;
    if (quantityStr.includes("/")) {
      const parts = quantityStr.split("/");
      quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else if (quantityStr.includes("-")) {
      const parts = quantityStr.split("-");
      quantity = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
    } else {
      quantity = parseFloat(quantityStr);
    }
    
    if (!isNaN(quantity)) {
      return { quantity, unit };
    }
  }
  
  return { quantity: -1, unit: trimmed };
}

/**
 * Extract ingredients as text for parseIngredients
 * Format: "quantity, unit, name" per line
 */
function extractIngredientsText(meal: MealDBMeal): string {
  const lines: string[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingredientName = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    
    if (ingredientName && ingredientName.trim() !== "") {
      const { quantity, unit } = parseMeasure(measure || "");
      lines.push(`${quantity}, ${unit}, ${ingredientName.trim()}`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Fetch all meal categories
 */
async function fetchCategories(): Promise<string[]> {
  const response = await fetch(`${MEALDB_BASE}/categories.php`);
  const data = await response.json();
  return data.categories.map((c: { strCategory: string }) => c.strCategory);
}

/**
 * Fetch all meals in a category
 */
async function fetchMealsByCategory(category: string): Promise<{ idMeal: string; strMeal: string }[]> {
  const response = await fetch(`${MEALDB_BASE}/filter.php?c=${encodeURIComponent(category)}`);
  const data = await response.json();
  return data.meals || [];
}

/**
 * Fetch full meal details by ID
 */
async function fetchMealById(id: string): Promise<MealDBMeal | null> {
  const response = await fetch(`${MEALDB_BASE}/lookup.php?i=${id}`);
  const data = await response.json();
  return data.meals?.[0] || null;
}

/**
 * Main seed function using concept actions
 */
export async function seedDatabase(
  db: Db,
  User: { createUser: () => Promise<{ userId: ID }> },
  Recipe: {
    createRecipe: (params: { owner: ID; title: string; link?: string; description?: string; isPublic?: boolean }) => Promise<{ recipe: ID } | { error: string }>;
    parseIngredients: (params: { requestedBy: ID; recipe: ID; ingredientsText: string }) => Promise<{ ingredients: unknown[] } | { error: string }>;
    setImage: (params: { requestedBy: ID; recipe: ID; image: string }) => Promise<Record<string, never> | { error: string }>;
    setRecipePublic: (params: { requestedBy: ID; recipe: ID; isPublic: boolean }) => Promise<Record<string, never> | { error: string }>;
  }
): Promise<void> {
  const seedMarker = db.collection<SeedStatus>("_seed_status");
  
  // Check if already seeded
  const alreadySeeded = await seedMarker.findOne({ key: "mealdb" });
  
  if (alreadySeeded) {
    console.log("Database already seeded with MealDB recipes, skipping...");
    return;
  }
  
  console.log("Seeding database from TheMealDB...");
  
  try {
    // Create system user for seeded recipes
    const { userId: systemUserId } = await User.createUser({});
    console.log(`Created system user: ${systemUserId}`);
    
    // Fetch all categories
    const categories = await fetchCategories();
    console.log(`Found ${categories.length} categories`);
    
    let totalSeeded = 0;
    const MAX_RECIPES = 400;
    
    for (const category of categories) {
      if (totalSeeded >= MAX_RECIPES) break;
      console.log(`  Fetching category: ${category}`);
      
      const meals = await fetchMealsByCategory(category);
      console.log(`    Found ${meals.length} meals`);
      
      for (const meal of meals) {
        if (totalSeeded >= MAX_RECIPES) break; 
        try {
          // Fetch full meal details
          const fullMeal = await fetchMealById(meal.idMeal);
          
          if (!fullMeal) continue;
          
          // Truncate description if too long
          let description = fullMeal.strInstructions || "No description available.";
          if (description.length > 2000) {
            description = description.substring(0, 2000) + "...";
          }
          
          // Get link (YouTube or source)
          const link = fullMeal.strYoutube || fullMeal.strSource || undefined;
          
          // Create recipe using concept action
          const createResult = await Recipe.createRecipe({
            owner: systemUserId,
            title: fullMeal.strMeal,
            link,
            description,
            isPublic: true,
          });
          
          if ("error" in createResult) {
            console.log(`    Skipping "${fullMeal.strMeal}": ${createResult.error}`);
            continue;
          }
          
          const recipeId = createResult.recipe;
          
          // Add ingredients
          const ingredientsText = extractIngredientsText(fullMeal);
          if (ingredientsText) {
            const ingredResult = await Recipe.parseIngredients({
              requestedBy: systemUserId,
              recipe: recipeId,
              ingredientsText,
            });
            
            if ("error" in ingredResult) {
              console.log(`    Warning: Failed to add ingredients for "${fullMeal.strMeal}": ${ingredResult.error}`);
            }
          }
          
          // Set image
          if (fullMeal.strMealThumb) {
            const imageResult = await Recipe.setImage({
              requestedBy: systemUserId,
              recipe: recipeId,
              image: fullMeal.strMealThumb,
            });
            
            if ("error" in imageResult) {
              console.log(`    Warning: Failed to set image for "${fullMeal.strMeal}": ${imageResult.error}`);
            }
          }
          
          totalSeeded++;
          
          // Small delay to be nice to the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (err) {
          console.error(`    Failed to seed meal ${meal.strMeal}:`, err);
        }
      }
    }
    
    // Mark as seeded
    await seedMarker.insertOne({ 
      key: "mealdb", 
      seededAt: new Date(),
      recipeCount: totalSeeded,
      systemUserId,
    });
    
    console.log(`Seeding complete! Added ${totalSeeded} recipes.`);
    
  } catch (err) {
    console.error("Seeding failed:", err);
    throw err;
  }
}