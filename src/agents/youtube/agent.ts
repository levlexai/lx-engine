import { z } from "zod";
import { YoutubeAgentRequest } from "../../interfaces";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { promptLlmWithJsonSchema, promptLlm } from "../../utils/promptLlm";

/**
 * We'll define a schema for the LLM to produce an array of YouTube video URLs.
 */
const youtubeUrlsSchema = z.object({
  urls: z.array(z.string()),
});

/**
 * runYouTubeAgent:
 * 1) generate array of YouTube URLs from the user prompt
 * 2) load transcripts from each URL
 * 3) build final prompt with transcripts referencing each source
 * 4) produce final answer with citations
 */
export async function runYouTubeAgent(request: YoutubeAgentRequest): Promise<string> {
  const { prompt, model } = request;

  // 1) Generate YouTube URLs
  const generationPrompt = `
Based on the following user prompt, generate a strictly valid JSON object with a key "urls" containing an array of YouTube video links.
No other keys or text.
User prompt: "${prompt}"
  `.trim();

  const parsed = await promptLlmWithJsonSchema(model, generationPrompt, youtubeUrlsSchema);
  // e.g. parsed = { urls: ["https://youtu.be/video1", "https://youtu.be/video2"] }

  const urls: string[] = parsed.urls;

  // 2) For each URL, load transcript with LangChain's YouTubeLoader
  // We'll gather them in an array
  let aggregatedContent: string[] = [];
  let citationIndex = 1;

  for (const url of urls) {
    try {
      const loader = YoutubeLoader.createFromUrl(url, {
        language: "en",
        addVideoInfo: false, // or true if you want video metadata
      });
      const docs = await loader.load();
      // docs is an array of Document objects. Typically there's 1 doc per transcript
      for (const doc of docs) {
        const transcript = doc.pageContent || "";
        // We'll label them [1], [2], etc. for each video or doc
        aggregatedContent.push(`[${citationIndex}] Transcript from: ${url}\n${transcript}`);
        citationIndex++;
      }
    } catch (err) {
      console.warn(`Failed to load transcript for ${url}:`, err);
    }
  }

  // 3) Build a final prompt that includes the user prompt + transcripts with references
  const transcriptsText = aggregatedContent.join("\n\n");
  const finalPrompt = `
You are an expert summarizer and fact-checker.
The user has asked: "${prompt}"

We have retrieved transcripts from the following YouTube sources (citations in brackets):
${transcriptsText}

Please provide a comprehensive answer, referencing the transcripts with citations [1], [2], etc.
`.trim();

  // 4) Generate the final answer using plain text (or structured) LLM
  const finalAnswer = await promptLlm(finalPrompt, model);
  return finalAnswer;
}
