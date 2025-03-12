// notebookManager.ts
import * as fs from "fs";
import * as path from "path";
import { Notebook, NotebookPage } from "../interfaces";

/**
 * The JSON file structure:
 * {
 *   "notebooks": [
 *     { "id": "notebook1", "title": "Notebook Title", "pages": [ ... ] },
 *     ...
 *   ]
 * }
 */
interface NotebookStoreData {
  notebooks: Notebook[];
}

// In-memory store of notebooks loaded from disk
let notebooks: Notebook[] = [];

// Path to the JSON file
const NOTEBOOKS_FILE = path.resolve("./data", "notebooks.json");

/**
 * initNotebookManager:
 * Call this once (e.g. at server startup) to ensure
 * notebooks are loaded from disk or an empty file is created.
 */
export function initNotebookManager(filePath = NOTEBOOKS_FILE) {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // If file doesn't exist, create an initial structure
  if (!fs.existsSync(filePath)) {
    const initial: NotebookStoreData = { notebooks: [] };
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
  }

  // Read from disk
  const raw = fs.readFileSync(filePath, "utf-8");
  const data: NotebookStoreData = JSON.parse(raw);

  // Just in case "notebooks" is missing or invalid, ensure it's an array
  if (!data.notebooks || !Array.isArray(data.notebooks)) {
    data.notebooks = [];
  }

  // Store in our in-memory array
  notebooks = data.notebooks;
}

/**
 * saveNotebooks:
 * Writes the current in-memory notebooks array to the JSON file.
 */
function saveNotebooks(filePath = NOTEBOOKS_FILE) {
  const data: NotebookStoreData = { notebooks };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * createNotebook:
 *  - Creates a new notebook with the given id, title, empty pages
 *  - If it already exists, return it instead
 */
export function createNotebook(id: string, title: string): Notebook {
  // Check if notebook with this id already exists
  const existing = notebooks.find((n) => n.id === id);
  if (existing) {
    return existing;
  }

  const newNotebook: Notebook = {
    id,
    title,
    pages: [],
  };
  notebooks.push(newNotebook);
  saveNotebooks();
  return newNotebook;
}

/**
 * getNotebook:
 *  - Retrieve an existing notebook by id, or undefined if not found
 */
export function getNotebook(id: string): Notebook | undefined {
  return notebooks.find((n) => n.id === id);
}

/**
 * getOrCreateNotebook:
 *  - If a notebook with the given id exists, return it
 *  - Otherwise create it with the specified title
 */
export function getOrCreateNotebook(id: string, title: string): Notebook {
  const existing = getNotebook(id);
  if (existing) {
    return existing;
  }
  return createNotebook(id, title);
}

/**
 * addPage:
 *  - Adds a new page to the specified notebook's pages array
 *  - If the notebook doesn't exist, throws an error
 */
export function addPage(notebookId: string, page: NotebookPage): void {
  const notebook = getNotebook(notebookId);
  if (!notebook) {
    throw new Error(`Notebook with id '${notebookId}' does not exist.`);
  }

  // (Optionally check if page.id is unique)
  notebook.pages.push(page);
  saveNotebooks();
}

/**
 * removeNotebook:
 *  - Removes a notebook with the given ID
 *  - Returns true if removed, false if not found
 */
export function removeNotebook(notebookID: string): boolean {
  const oldLength = notebooks.length;
  notebooks = notebooks.filter((n) => n.id !== notebookID);
  const removed = notebooks.length < oldLength;
  if (removed) {
    saveNotebooks();
  }
  return removed;
}
