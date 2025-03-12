import { DeleteNotebookPageRequest, Notebook } from "../../interfaces";
import { getNotebook } from "../../utils/notebookManager"; // your manager that can retrieve the notebook

/**
 * runDeleteNotebookPageAgent:
 * 1. Finds the notebook by notebookID
 * 2. Removes the page with the given pageID from notebook.pages
 * 3. Persists the changes (via your manager's write logic)
 * 4. Returns true if page was found & removed, false otherwise
 */
export async function runDeleteNotebookPageAgent(
  request: DeleteNotebookPageRequest
): Promise<boolean> {
  const { notebookID, pageID } = request;

  // 1) Retrieve the notebook
  const notebook: Notebook | undefined = getNotebook(notebookID);
  if (!notebook) {
    throw new Error(`Notebook with ID '${notebookID}' not found.`);
  }

  // 2) Try removing the page
  const oldLength = notebook.pages.length;
  notebook.pages = notebook.pages.filter((p) => p.id !== pageID);

  // if length changed => we removed something
  const removed = notebook.pages.length < oldLength;

  // 3) Persist changes (e.g. your manager might have updateNotebook or db.write)
  // E.g.: updateNotebook(notebookID, notebook); or do your own manager logic
  // e.g.: notebookDB.write()

  // 4) Return success if we actually removed a page
  return removed;
}
