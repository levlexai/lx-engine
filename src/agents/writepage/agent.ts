import { z } from "zod";
import { WritePageAgentRequest, WritePageAgentResponse } from "../../interfaces";
import { getNotebook, addPage } from "../../utils/notebookManager"; // your manager
import { v4 as uuidv4 } from "uuid";
import { promptLlmWithJsonSchema } from "../../utils/promptLlm";

// We'll define a schema for the page content that the LLM must produce.
const pageSchema = z.object({
  title: z.string(),
  content: z.array(z.string()), // array of markdown blocks
});

export async function runWritePageAgent(
  request: WritePageAgentRequest
): Promise<WritePageAgentResponse> {
  const { prompt, model, notebookID } = request;

  // 1) Prompt the LLM for a page object
  // The LLM must return JSON that matches { "title": string, "content": string[] }
  const generationPrompt = `
You are a helpful writer. 
The user wants a new notebook page. 
Each string in the 'content' array is a block of markdown.

Please provide a JSON object that strictly follows:
{
  "title": string,
  "content": string[]
}
No extra commentary or text.
User's request: "${prompt}"
  `.trim();

  // parse the result with pageSchema
  const parsedPage = await promptLlmWithJsonSchema(model, generationPrompt, pageSchema);

  // 2) Construct the page with a new ID
  const pageID = uuidv4();
  const page = {
    id: pageID,
    title: parsedPage.title,
    content: parsedPage.content,
  };

  // 3) Retrieve (or create) the notebook, then add the page
  const notebook = getNotebook(notebookID);
  if (!notebook) {
    throw new Error(`Notebook with ID "${notebookID}" does not exist.`);
  }

  // addPage is presumably a function that modifies the notebook's pages 
  // and saves to your persistent store
  addPage(notebookID, page);

  // 4) Return the final response
  const response: WritePageAgentResponse = {
    pageID,
    notebookID,
    page,
  };

  return response;
}
