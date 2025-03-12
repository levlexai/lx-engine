import { DeleteNotebookRequest } from "../../interfaces";
import { getNotebook, removeNotebook } from "../../utils/notebookManager"; 
  // removeNotebook is a method we’ll define below 
  // that filters out the notebook from the store 
  // and writes to disk

/**
 * runDeleteNotebookAgent:
 *  - Removes a notebook from persistent storage
 *  - If not found, returns false or throws an error (your choice)
 *  - Otherwise returns true
 */
export async function runDeleteNotebookAgent(
  request: DeleteNotebookRequest
): Promise<boolean> {
  const { notebookID } = request;

  // Check if it even exists
  const notebook = getNotebook(notebookID);
  if (!notebook) {
    // Either throw or return false
    // throw new Error(`Notebook with ID "${notebookID}" not found.`);
    return false;
  }

  // If found, remove it
  const removed = removeNotebook(notebookID);
  return removed;
}