import { GetNotebookRequest, GetNotebookResponse, Notebook } from "../../interfaces";
import { getNotebook } from "../../utils/notebookManager"; 

export async function runGetNotebookAgent(request: GetNotebookRequest): Promise<GetNotebookResponse> {
  const { notebookID } = request;

  // Retrieve the notebook using your manager
  const notebook: Notebook | undefined = getNotebook(notebookID);
  if (!notebook) {
    // If not found, either throw an error or handle it in some default way
    throw new Error(`Notebook with ID "${notebookID}" not found.`);
  }

  // Return the notebook object
  const response: GetNotebookResponse = {
    notebook,
  };
  return response;
}
