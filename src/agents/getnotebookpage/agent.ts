import { GetPageRequest, GetPageResponse, NotebookPage } from "../../interfaces";
import { getNotebook } from "../../utils/notebookManager"; // your notebook manager with getNotebook

/**
 * runGetPageAgent:
 * - Loads the notebook by notebookID
 * - Finds the page by pageID
 * - Returns that page in a GetPageResponse
 */
export async function runGetPageAgent(request: GetPageRequest): Promise<GetPageResponse> {
  const { notebookID, pageID } = request;

  // Retrieve the notebook
  const notebook = getNotebook(notebookID);
  if (!notebook) {
    throw new Error(`Notebook with ID "${notebookID}" not found.`);
  }

  // Find the page
  const page: NotebookPage | undefined = notebook.pages.find((p) => p.id === pageID);
  if (!page) {
    throw new Error(`Page with ID "${pageID}" not found in notebook "${notebookID}".`);
  }

  // Return in the proper response shape
  const response: GetPageResponse = { page };
  return response;
}
