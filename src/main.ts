/**
 * Entry point for an application built with concepts + synchronizations.
 * Requires the Requesting concept as a bootstrap concept.
 * Please run "deno run import" or "generate_imports.ts" to prepare "@concepts".
 */
import * as concepts from "@concepts";

// Use the following line instead to run against the test database, which resets each time.
// import * as concepts from "@test-concepts";

const { Engine, db, User, Recipe } = concepts;
import { Logging } from "@engine";
import { startRequestingServer } from "@concepts/Requesting/RequestingConcept.ts";
import syncs from "@syncs";
import { seedDatabase } from "./seed.ts";

/**
 * Available logging levels:
 *   Logging.OFF
 *   Logging.TRACE - display a trace of the actions.
 *   Logging.VERBOSE - display full record of synchronization.
 */
Engine.logging = Logging.TRACE;

// Register synchronizations
Engine.register(syncs);

// Seed database with MealDB recipes (only runs once)
await seedDatabase(db, User, Recipe);

// Start a server to provide the Requesting concept with external/system actions.
startRequestingServer(concepts);