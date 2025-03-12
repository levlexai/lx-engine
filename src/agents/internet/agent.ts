// ██╗███╗░░██╗████████╗███████╗██████╗░███╗░░██╗███████╗████████╗  ░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██║████╗░██║╚══██╔══╝██╔════╝██╔══██╗████╗░██║██╔════╝╚══██╔══╝  ██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ██║██╔██╗██║░░░██║░░░█████╗░░██████╔╝██╔██╗██║█████╗░░░░░██║░░░  ███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██║██║╚████║░░░██║░░░██╔══╝░░██╔══██╗██║╚████║██╔══╝░░░░░██║░░░  ██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ██║██║░╚███║░░░██║░░░███████╗██║░░██║██║░╚███║███████╗░░░██║░░░  ██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ╚═╝╚═╝░░╚══╝░░░╚═╝░░░╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝╚══════╝░░░╚═╝░░░  ╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Internet Agent

// Notes
// - Works best with long-context models

import { InternetAgentRequest } from "../../interfaces";
import { z } from "zod";
import { promptLlmWithJsonSchema, promptLlm } from "../../utils/promptLlm";
import { tavilyQuery, jinaQuery, braveQuery, exaQuery, duckduckgoQuery } from "../../utils/internetQueries";

export async function runInternetAgent(request: InternetAgentRequest): Promise<string> {
    const { prompt, n_queries = 3, service, model } = request;
  
    // Step 1: Generate search queries using structured output.
    // We instruct the LLM to generate an object with a "queries" field that is an array of query strings.
    const querySchema = z.object({
      queries: z.array(z.string())
    });
    
    const queryPrompt = `
  Based on the following user prompt, generate ${n_queries} distinct and evidence-focused search queries.
  Output the result strictly as valid JSON with a key "queries" that contains an array of query strings.
  User prompt: "${prompt}"
    `;
    
    const queryResult = await promptLlmWithJsonSchema(model, queryPrompt, querySchema);
    const queries: string[] = queryResult.queries;
    
    // Step 2: Perform searches for each query using the selected Internet search service.
    // Default to "tavily" if no service is provided.
    const serviceName: string = service?.name || "tavily";
    // Use the service API key if provided, otherwise fall back to the model's key.
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
    
    // Step 3: Build a detailed final prompt for the final answer.
    // We want to include the original user query and the search results (with citation numbers).
    let searchResultsText = "";
    aggregatedResults.forEach((result, index) => {
      const snippet = result.content || result.markdown || "";
      // Each result gets a citation number (e.g., [1], [2], etc.)
      searchResultsText += `[${index + 1}] ${snippet} (${result.link})\n`;
    });
    
    // Append comprehensive system instructions and evidence requirements.
    const finalPrompt = `
  You are an expert researcher and fact-checker. 
  Your task is to answer the following user query using the provided search results as evidence.
  Ensure that every claim in your answer is backed by a citation referring to the corresponding search result (e.g., [1], [2], etc.).
  
  User Query: "${prompt}"
  
  Search Results (each citation number corresponds to a result):
  ${searchResultsText}
  
  Please produce a final, comprehensive answer that integrates these search results with clear citations.
    `;
    
    // Step 4: Generate the final answer using the plain text prompt function.
    const finalAnswer: string = await promptLlm(finalPrompt, model);
    
    return finalAnswer;
  }