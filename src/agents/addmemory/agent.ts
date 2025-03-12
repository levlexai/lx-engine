// addMemory.ts
import { AddMemoryRequest } from "../../interfaces";
import { getTable } from "./../../utils/tableManager";
// @ts-ignore
import embeddings from "@themaximalist/embeddings.js";

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
 * 2) embed each chunk using embeddings.js 
 * 3) store in table named after brainID 
 */
export async function addMemory(request: AddMemoryRequest): Promise<boolean> {
  try {

    const { memory, brainID } = request;
  
    // chunk the memory
    const chunks = chunkText(memory, 300);

    // get or create the table 
    const table = await getTable(brainID);

    // embed each chunk, store in LanceDB
    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        // default local embeddings are 384-dim
        // to use openai: embeddings(chunkText, { service: "openai", model: "text-embedding-ada-002" })
        const vector = await embeddings(chunkText);
        rows.push({
        chunk: chunkText,
        vector,
        chunkIndex: i
        });
    }

    await table.add(rows);
    // optionally create an index if we want vector search:
    // await table.createIndex("vector");

    return true;
    
  } catch (error) {
    console.error("Error adding memory:", error);
    return false;
  }
}
