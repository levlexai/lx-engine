// tableManager.ts
import * as fs from "fs";
import * as path from "path";
import * as lancedb from "@lancedb/lancedb";

/**
 * We'll keep a single LanceDB instance for all brains in `./lancedb_data`.
 * We also store a simple JSON file that tracks which brainIDs exist.
 */
let globalDb: Awaited<ReturnType<typeof lancedb.connect>> | null = null;

/**
 * The map of brainID => boolean for existence.
 * We'll load/store this to a JSON file, e.g. "./data/brainsMap.json"
 */
let brainsMap: Record<string, boolean> = {};

/**
 * The JSON file path that tracks existing brainIDs
 */
const BRAINS_FILE = path.resolve("./data", "brainsMap.json");

/**
 * Ensure the "./data" folder exists, read (or create) brainsMap.json,
 * connect to LanceDB in "./lancedb_data".
 */
export async function initTableManager(): Promise<void> {
  // 1) Connect to LanceDB if needed
  if (!globalDb) {
    globalDb = await lancedb.connect("./lancedb_data"); 
    // ensures "./lancedb_data" directory is used for LanceDB
  }

  // 2) Load brains map from JSON
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data", { recursive: true });
  }
  if (!fs.existsSync(BRAINS_FILE)) {
    // If file doesn't exist, create it with an empty map
    const initial = { brains: {} };
    fs.writeFileSync(BRAINS_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }

  // read from the file
  const raw = fs.readFileSync(BRAINS_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  // ensure "brains" is an object
  if (!parsed.brains || typeof parsed.brains !== "object") {
    parsed.brains = {};
  }

  brainsMap = parsed.brains;
}

/**
 * Save the current in-memory `brainsMap` to the JSON file.
 */
function saveBrainsMap() {
  const data = { brains: brainsMap };
  fs.writeFileSync(BRAINS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * getTable:
 * 1) ensures table for 'brainID' exists in LanceDB
 * 2) If not present, create a blank table
 * 3) Return the opened table
 */
export async function getTable(brainID: string) {
  if (!globalDb) {
    throw new Error("Must call initTableManager() before getTable().");
  }

  // If the brainID not in brainsMap, that means it's not created yet
  let hasTable = !!brainsMap[brainID];
  if (!hasTable) {
    // create an empty table
    await globalDb.createTable(brainID, [], { mode: "overwrite" });
    brainsMap[brainID] = true;
    saveBrainsMap();
  }

  // now open it
  return await globalDb.openTable(brainID);
}

/**
 * dropTable:
 *  - If 'brainID' is known to exist in brainsMap, drop it from LanceDB,
 *    remove from brainsMap, save, and return true
 *  - Otherwise return false
 */
export async function dropTable(brainID: string): Promise<boolean> {
  if (!globalDb) {
    throw new Error("Must call initTableManager() before dropTable().");
  }

  const hasTable = !!brainsMap[brainID];
  if (!hasTable) {
    return false;
  }

  // drop from LanceDB
  await globalDb.dropTable(brainID);

  // remove from brainsMap
  delete brainsMap[brainID];
  saveBrainsMap();

  return true;
}
