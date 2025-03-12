// ░██████╗███████╗░██████╗░██╗░░░██╗███████╗███╗░░██╗████████╗██╗░█████╗░██╗░░░░░
// ██╔════╝██╔════╝██╔═══██╗██║░░░██║██╔════╝████╗░██║╚══██╔══╝██║██╔══██╗██║░░░░░
// ╚█████╗░█████╗░░██║██╗██║██║░░░██║█████╗░░██╔██╗██║░░░██║░░░██║███████║██║░░░░░
// ░╚═══██╗██╔══╝░░╚██████╔╝██║░░░██║██╔══╝░░██║╚████║░░░██║░░░██║██╔══██║██║░░░░░
// ██████╔╝███████╗░╚═██╔═╝░╚██████╔╝███████╗██║░╚███║░░░██║░░░██║██║░░██║███████╗
// ╚═════╝░╚══════╝░░░╚═╝░░░░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░╚═╝╚═╝░░╚═╝╚══════╝

// ██╗███╗░░██╗████████╗███████╗██████╗░███╗░░██╗███████╗████████╗  ░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██║████╗░██║╚══██╔══╝██╔════╝██╔══██╗████╗░██║██╔════╝╚══██╔══╝  ██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ██║██╔██╗██║░░░██║░░░█████╗░░██████╔╝██╔██╗██║█████╗░░░░░██║░░░  ███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██║██║╚████║░░░██║░░░██╔══╝░░██╔══██╗██║╚████║██╔══╝░░░░░██║░░░  ██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ██║██║░╚███║░░░██║░░░███████╗██║░░██║██║░╚███║███████╗░░░██║░░░  ██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ╚═╝╚═╝░░╚══╝░░░╚═╝░░░╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝╚══════╝░░░╚═╝░░░  ╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Sequential Internet Agent

// Notes
// - Works best with long-context models

import { SequentialInternetAgentRequest, InternetAgentRequest, Model, InternetService } from "../../interfaces";
import { z } from "zod";
import { promptLlmWithJsonSchema, promptLlm } from "../../utils/promptLlm";
import { tavilyQuery, jinaQuery, braveQuery, exaQuery, duckduckgoQuery } from "../../utils/internetQueries";

// Decision schema for whether to search again
const decisionSchema = z.object({
  search_again: z.boolean(),
  additional_prompt: z.string()
});

export async function runSequentialInternetAgent(request: SequentialInternetAgentRequest): Promise<string> {
  const { prompt, n_queries = 3, max_recursion = 10, service, model } = request;

  // Recursive helper function
  async function sequentialSearch(currentPrompt: string, recursionCount: number): Promise<string> {
    // If maximum recursion reached, generate a final answer and return it.
    if (recursionCount >= max_recursion) {
      return await promptLlm(currentPrompt, model);
    }

    // --- Step 1: Generate search queries using structured output ---
    const querySchema = z.object({
      queries: z.array(z.string())
    });
    const queryPrompt = `
Based on the following user prompt, generate ${n_queries} distinct and evidence-focused search queries.
Output the result strictly as valid JSON with a key "queries" that contains an array of query strings.
User prompt: "${currentPrompt}"
    `;
    const queryResult = await promptLlmWithJsonSchema(model, queryPrompt, querySchema);
    const queries: string[] = queryResult.queries;

    // --- Step 2: Perform searches using the chosen internet service ---
    const serviceName: string = service?.name || "tavily";
    const serviceAk: string = service?.ak || model.ak;

    let aggregatedResults: Array<{ link: string; content?: string; markdown?: string }> = [];
    for (const query of queries) {
      let resultsForQuery: Array<{ link: string; content?: string; markdown?: string }> = [];
      if (serviceName === 'tavily') {
        resultsForQuery = await tavilyQuery(query, serviceAk, false);
      } else if (serviceName === 'jina') {
        resultsForQuery = await jinaQuery(query, serviceAk);
      } else if (serviceName === 'brave') {
        resultsForQuery = await braveQuery(query, serviceAk);
      } else if (serviceName === 'exa') {
        resultsForQuery = await exaQuery(query, serviceAk);
      } else {
              resultsForQuery = await duckduckgoQuery(query);
      }
      aggregatedResults.push(...resultsForQuery);
    }

    // --- Step 3: Build a detailed final prompt including search results ---
    let searchResultsText = "";
    aggregatedResults.forEach((result, index) => {
      const snippet = result.content || result.markdown || "";
      searchResultsText += `[${index + 1}] ${snippet} (${result.link})\n`;
    });

    const finalPrompt = `
You are an expert researcher and fact-checker.
Your task is to answer the following user query using the provided search results as evidence.
Ensure that every claim in your answer is backed by a citation referring to the corresponding search result (e.g., [1], [2], etc.).

User Query: "${currentPrompt}"

Search Results (each citation number corresponds to a result):
${searchResultsText}

Please produce a final, comprehensive answer that integrates these search results with clear citations.
    `;
    // --- Step 4: Generate a candidate answer ---
    const candidateAnswer: string = await promptLlm(finalPrompt, model);

    // --- Step 5: Ask whether additional search is needed ---
    const decisionPrompt = `
You are an expert researcher reviewing the following candidate answer and its supporting search results.
Candidate Answer: "${candidateAnswer}"
Search Results:
${searchResultsText}

Based on the above, decide if additional internet search is needed to further refine and improve the answer.
Respond strictly as valid JSON using the following schema:
{
  "search_again": boolean,
  "additional_prompt": string
}
If further search is needed, set "search_again" to true and provide an updated query in "additional_prompt". Otherwise, set "search_again" to false.
    `;
    const decisionResult = await promptLlmWithJsonSchema(model, decisionPrompt, decisionSchema);
    
    if (decisionResult.search_again) {
      // Recurse with the new prompt (combining previous answer with additional instructions)
      const newPrompt = decisionResult.additional_prompt;
      // Optionally, you might combine newPrompt with candidateAnswer to preserve context.
      return await sequentialSearch(newPrompt, recursionCount + 1);
    } else {
      // No further search needed; return the candidate answer.
      return candidateAnswer;
    }
  }

  // Start the recursion with the initial prompt.
  return await sequentialSearch(prompt, 0);
}
