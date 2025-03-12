import { ReadWebpageAgentRequest } from "../../interfaces";
import { promptLlm } from "../../utils/promptLlm";   // your LLM function
import TurndownService from "turndown";

/**
 * runReadWebpageAgent:
 * 1) fetch the webpage at 'url'
 * 2) convert HTML to text or markdown
 * 3) combine with user prompt
 * 4) call promptLlm for final answer
 */
export async function runReadWebpageAgent(request: ReadWebpageAgentRequest): Promise<string> {
  const { url, model, prompt } = request;

  // 1) Fetch the webpage
  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${url}, status: ${response.status}`);
    }
  } catch (err) {
    throw new Error(`Error fetching webpage at "${url}": ${err}`);
  }

  // 2) Convert the HTML to Markdown (or plain text) using Turndown
  const html = await response.text();
  const turndownService = new TurndownService();
  const pageContent = turndownService.turndown(html);

  // 3) Build final prompt
  const finalPrompt = `
We have the following webpage content from "${url}":

${pageContent}

The user says: "${prompt}"

Please provide a comprehensive answer referencing the webpage content if relevant.
`.trim();

  // 4) Call LLM
  const answer = await promptLlm(finalPrompt, model);
  return answer;
}
