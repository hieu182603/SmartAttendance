/**
 * Environment variables bootstrap
 * MUST be imported FIRST in index.js before any other project modules.
 * ES modules hoist all imports, so dotenv.config() inside a regular module
 * runs AFTER all sibling imports. By isolating it here, this module's body
 * executes before any module that depends on process.env values.
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicitly point to backend/.env — dotenv defaults to process.cwd(),
// which may NOT be the backend/ folder (e.g. when run from repo root).
const envPath = resolve(__dirname, "../../.env");
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error(`❌ Failed to load .env from: ${envPath}`, result.error);
}
