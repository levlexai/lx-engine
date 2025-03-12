import { ReadPageAgentRequest, NotebookPage, Notebook } from "../../interfaces";
import { getNotebook } from "../../utils/notebookManager";
import { promptLlm } from "../../utils/promptLlm";

export async function runReadPageAgent(request: ReadPageAgentRequest): Promise<string> {
    const { prompt, model, notebookID, pageID } = request;
  
    // 1) Retrieve the notebook by ID
    const notebook = getNotebook(notebookID);
    if (!notebook) {
      throw new Error(`Notebook with ID '${notebookID}' not found.`);
    }
  
    // 2) Find the page in that notebook
    const page = notebook.pages.find((p) => p.id === pageID);
    if (!page) {
      throw new Error(`Page with ID '${pageID}' not found in notebook '${notebookID}'.`);
    }
  
    // The page content is an array of strings. We'll combine them into one block.
    const pageContent = page.content.join("\n");
  
    // 3) Build a final prompt with page info and user prompt
    const finalPrompt = `
  We have a page from this notebook:
  Title: ${page.title}
  Content:
  ${pageContent}
  
  Now the user says:
  "${prompt}"
  
  Please provide a relevant response that references or uses the page content above.
  `.trim();
  
    // 4) Send finalPrompt to the LLM
    const answer = await promptLlm(finalPrompt, model);
    return answer;
}
  