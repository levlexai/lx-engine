import { z } from "zod";
import { AddToPageAgentRequest, AddToPageAgentResponse } from "../../interfaces";
import { getNotebook } from "../../utils/notebookManager"; // your manager
import { promptLlmWithJsonSchema } from "../../utils/promptLlm";

/**
 * We'll define a schema for the appended blocks:
 * { content: string[] }
 * The model must produce an array of markdown strings to append.
 */
const appendedContentSchema = z.object({
  content: z.array(z.string()),
});

export async function runAddToPageAgent(
  request: AddToPageAgentRequest
): Promise<AddToPageAgentResponse> {
  const { prompt, model, notebookID, pageID } = request;

  // 1) Get the notebook & page
  const notebook = getNotebook(notebookID);
  if (!notebook) {
    throw new Error(`Notebook with ID "${notebookID}" not found.`);
  }
  const page = notebook.pages.find((p) => p.id === pageID);
  if (!page) {
    throw new Error(`Page with ID "${pageID}" not found in notebook "${notebookID}".`);
  }

  // 2) Prompt the LLM for an array of new markdown blocks to append
  const generationPrompt = `
You are a helpful writer. The user wants to append new content to an existing page.
The existing page title is "${page.title}" and the user has asked: "${prompt}"

We want strictly valid JSON with a key "content" that is an array of new markdown strings to add to the page.

No extra commentary or keys.
`.trim();

  const parsed = await promptLlmWithJsonSchema(model, generationPrompt, appendedContentSchema);
  // e.g. parsed = { content: ["## New heading", "- bullet", "..."] }

  // 3) Append to page
  page.content.push(...parsed.content);

  // (Optionally call your manager's "write" or "update" method if needed to persist.)
  // e.g. updateNotebook(notebookID, notebook);

  // 4) Return the updated page info
  const response: AddToPageAgentResponse = {
    pageID,
    notebookID,
    page: {
      ...page,
      // page.id, page.title, page.content updated
    },
  };
  return response;
}
