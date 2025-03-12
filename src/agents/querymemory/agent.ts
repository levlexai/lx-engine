// @ts-ignore
import embeddings from "@themaximalist/embeddings.js";
import { QueryMemoryRequest, QueryMemoryResponse, QueryMemoryResult } from "../../interfaces";
import { getTable } from "../../utils/tableManager"; // your LanceDB manager

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

  // 2) Embed the query with Embeddings.js (defaults to local 384-dim)
  // If you want e.g. openai embeddings: embeddings(query, { service: "openai", model: "text-embedding-ada-002" })
  const queryVector = await embeddings(query);

  // 3) Search the table, limiting results to topK
  // The .score is typically a distance => lower = more similar
  const results = await table.search(queryVector).limit(n_results).toArray();

  // 4) Build the array of { memory, similarity }
  // We'll do a simple transformation: similarity = 1 / (1 + distance)
  const memories: QueryMemoryResult[] = results.map((r: any) => {
    const distance: number = r.score || 0;
    return {
      memory: (r.chunk as string) || "", // or r.text, r.content, depending on how you stored it
      distance,
    };
  });
  
  return { memories };  
}
