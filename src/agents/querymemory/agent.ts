// queryMemoryAgent.ts
import { QueryMemoryRequest, QueryMemoryResponse, QueryMemoryResult } from "../../interfaces";
import { getTable } from "../../utils/tableManager"; // your LanceDB manager
import { EmbeddingModel, FlagEmbedding } from "fastembed";

/**
 * queryMemoryAgent:
 * 1) retrieve LanceDB table for the given brainID
 * 2) embed the query
 * 3) do a vector search, limit topK
 * 4) map results to memory + similarity
 */
export async function runQueryMemoryAgent(request: QueryMemoryRequest): Promise<QueryMemoryResponse> {
  const { query, brainID, n_results = 5 } = request;

  // 1) Open or create the LanceDB table for this brain
  const table = await getTable(brainID);

  // 2) Initialize fastembed + embed the query
  // For short user prompts, queryEmbed is recommended
  const embeddingModel = await FlagEmbedding.init({
    model: EmbeddingModel.BGEBaseEN
  });
  const queryVector = await embeddingModel.queryEmbed(query);

  // 3) Search the table, limiting results to topK
  // The .score is typically a distance => lower = more similar
  const results = await table.search(queryVector).limit(n_results).toArray();

  // 4) Build the array of { memory, distance }
  // (Optional) If you prefer a similarity measure, you could do e.g. similarity = 1 / (1 + distance)
  const memories: QueryMemoryResult[] = results.map((r: any) => {
    const distance: number = r.score ?? 0;
    return {
      memory: (r.chunk as string) || "",
      distance
    };
  });

  return { memories };
}
