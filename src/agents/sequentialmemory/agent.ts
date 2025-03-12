import { z } from "zod";
import { promptLlmWithJsonSchema, promptLlm } from "../../utils/promptLlm";
import { getTable } from "../../utils/tableManager"; // your LanceDB table manager
import { SequentialMemoryAgentRequest } from "../../interfaces";
import { EmbeddingModel, FlagEmbedding } from "fastembed"; // <-- Use fastembed

// We'll define a decision schema for whether to continue searching
const decisionSchema = z.object({
  search_again: z.boolean(),
  additional_prompt: z.string(),
});

// Optional: Keep a single instance of the model to avoid re-initializing it
let cachedEmbeddingModel: FlagEmbedding | null = null;
async function getEmbeddingModel(): Promise<FlagEmbedding> {
  if (!cachedEmbeddingModel) {
    cachedEmbeddingModel = await FlagEmbedding.init({
      model: EmbeddingModel.BGEBaseEN,
    });
  }
  return cachedEmbeddingModel;
}

export async function runSequentialMemoryAgent(
  request: SequentialMemoryAgentRequest
): Promise<string> {
  const {
    prompt,
    n_queries = 3,
    max_recursion = 10,
    brainID,
    model,
  } = request;

  // A recursive helper function
  async function sequentialSearch(
    currentPrompt: string,
    recursionCount: number
  ): Promise<string> {
    // If recursion limit is reached, just finalize
    if (recursionCount >= max_recursion) {
      return promptLlm(currentPrompt, model);
    }

    // 1) Generate memory queries using structured output
    const querySchema = z.object({
      queries: z.array(z.string()),
    });

    const queryPrompt = `
Based on the following user prompt, generate ${n_queries} distinct queries
that best retrieve relevant memory from the local memory store.
Output strictly valid JSON with "queries" as an array of query strings.
User prompt: "${currentPrompt}"
    `;
    const queryResult = await promptLlmWithJsonSchema(
      model,
      queryPrompt,
      querySchema
    );
    const queries: string[] = queryResult.queries;

    // 2) For each query, embed & search LanceDB
    const aggregatedResults: string[] = [];
    const table = await getTable(brainID);

    // Get or initialize the fastembed model once here
    const embeddingModel = await getEmbeddingModel();

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];

      // Use queryEmbed for short query text
      const queryVector = await embeddingModel.queryEmbed(q);

      // Vector search in the LanceDB table
      const results = await table.search(queryVector).limit(5).toArray();

      // Accumulate the memory text with citations
      results.forEach((row: any, idx: number) => {
        const chunkText = row.chunk || "";
        // We'll label them e.g. [1.1], [1.2], ...
        aggregatedResults.push(`[${i + 1}.${idx + 1}] ${chunkText}`);
      });
    }

    // 3) Build a final prompt with memory results
    const memoryResultsText = aggregatedResults.join("\n");
    const finalPrompt = `
You are an expert memory agent. The user asked:
"${currentPrompt}"

Below are relevant memory chunks from the local store (citations in brackets):
${memoryResultsText}

Now, please provide a comprehensive, fact-based answer to the user's prompt,
citing the memory chunks (e.g., [1.1], [2.3]) where applicable.
    `;
    // Generate a candidate answer
    const candidateAnswer: string = await promptLlm(finalPrompt, model);

    // 4) Decide if further memory search is needed
    const decisionPrompt = `
You are an expert memory reviewer. We have a candidate answer and the memory chunks used.

Candidate Answer: "${candidateAnswer}"

Memory Chunks:
${memoryResultsText}

Decide if we need more memory search to refine or improve the answer.
Return strictly valid JSON using this schema:
{
  "search_again": boolean,
  "additional_prompt": string
}
If more memory is needed, set "search_again"=true and provide an updated query or user prompt
in "additional_prompt". Otherwise set "search_again"=false.
    `;
    const decisionResult = await promptLlmWithJsonSchema(
      model,
      decisionPrompt,
      decisionSchema
    );

    if (decisionResult.search_again) {
      // Recurse with the new prompt
      const newPrompt = decisionResult.additional_prompt;
      return sequentialSearch(newPrompt, recursionCount + 1);
    } else {
      // We are done
      return candidateAnswer;
    }
  }

  // Initiate recursion
  return sequentialSearch(prompt, 0);
}
