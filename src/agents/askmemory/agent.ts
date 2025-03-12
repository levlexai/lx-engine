import { AskMemoryAgentRequest } from "../../interfaces";
import { z } from "zod";
import { promptLlmWithJsonSchema, promptLlm } from "../../utils/promptLlm";
import { getTable } from "../../utils/tableManager"; // the file where you have initTableManager & getTable
// @ts-ignore
import embeddings from "@themaximalist/embeddings.js";

/**
 * askMemoryAgent:
 * 1) Generate queries using structured output
 * 2) For each query, embed and do a LanceDB search in the given `brainID`
 * 3) Aggregate results, build a final prompt, ask the LLM for final answer
 */
export async function runAskMemoryAgent(request: AskMemoryAgentRequest): Promise<string> {
  const { prompt, n_queries = 3, model, brainID } = request;

  // 1) Generate queries using structured output
  const querySchema = z.object({
    queries: z.array(z.string()),
  });

  const queryPrompt = `
Based on the following user prompt, generate ${n_queries} distinct queries
that best retrieve relevant memories from the local memory store.
Output strictly valid JSON with a key "queries" that contains an array of query strings.
User prompt: "${prompt}"
  `;

  const queryResult = await promptLlmWithJsonSchema(model, queryPrompt, querySchema);
  const queries: string[] = queryResult.queries;

  // 2) For each query, embed, then search LanceDB in the given brain table
  const table = await getTable(brainID); 
  let aggregatedResults: string[] = [];

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    // embed the query
    const queryVector = await embeddings(q);
    // do a vector search
    const results = await table.search(queryVector).limit(5).toArray();
    // Each result row includes (chunk, vector, [any other fields]) plus .score
    // We'll store them for final answer
    results.forEach((row: any, idx: any) => {
      const text = row.chunk || "";
      // We'll do a citation bracket like [i. idxInResults]
      // e.g. [1.1], [1.2], [2.1], etc.
      aggregatedResults.push(`[${i + 1}.${idx + 1}] ${text}`);
    });
  }

  // 3) Build a final prompt for the final answer
  // similar to the internet approach: each chunk is cited with a bracket
  let memoryResultsText = aggregatedResults.join("\n");

  const finalPrompt = `
You are an expert memory retrieval agent. The user asked:
"${prompt}"

We have retrieved the following memory chunks from the local store (citations in brackets):
${memoryResultsText}

Now please provide a comprehensive, fact-based answer to the user's prompt. 
`;

  // 4) Generate final answer using plain text prompt function
  const finalAnswer: string = await promptLlm(finalPrompt, model);

  return finalAnswer;
}
