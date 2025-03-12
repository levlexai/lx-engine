// addMemory.ts
import { AddMemoryRequest } from "../../interfaces";
import { getTable } from "../../utils/tableManager";
import { EmbeddingModel, FlagEmbedding } from "fastembed";

/** 
 * chunkText: splits text by whitespace into ~300 "words" per chunk 
 */
function chunkText(text: string, maxTokens = 300): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const w of words) {
    current.push(w);
    if (current.length >= maxTokens) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(" "));
  }
  return chunks;
}

/**
 * addMemory:
 * 1) chunk memory into 300-word segments
 * 2) embed each chunk using fastembed
 * 3) store in table named after brainID
 */
export async function addMemory(request: AddMemoryRequest): Promise<boolean> {
  try {
    const { memory, brainID } = request;

    // chunk the memory
    const chunks = chunkText(memory, 300);

    // get or create the table 
    const table = await getTable(brainID);

    // initialize fastembed model (BGEBaseEN is just an example)
    const embeddingModel = await FlagEmbedding.init({
      model: EmbeddingModel.BGEBaseEN
    });

    // embed each chunk in batches 
    const rows: Array<{ chunk: string; vector: number[]; chunkIndex: number }> = [];
    let chunkIndex = 0;

    // embeddingModel.passageEmbed returns an async iterator over batch results
    const embeddingIterator = embeddingModel.passageEmbed(chunks, 10); 
    // The second argument (10) is an optional batch size – adjust as desired

    for await (const batch of embeddingIterator) {
      // batch is an array of Float32 embeddings, each embedding is number[]
      for (const vector of batch) {
        rows.push({
          chunk: chunks[chunkIndex],
          vector, 
          chunkIndex
        });
        chunkIndex++;
      }
    }

    // store embedded rows in your LanceDB table
    await table.add(rows);

    // optionally create an index if you want vector search:
    // await table.createIndex("vector");

    return true;
  } catch (error) {
    console.error("Error adding memory:", error);
    return false;
  }
}
