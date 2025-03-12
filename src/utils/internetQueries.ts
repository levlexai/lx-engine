import TurndownService from 'turndown';
import Exa from 'exa-js';
import { search, SafeSearchType } from "duck-duck-scrape";

const turndownService = new TurndownService();
const TAVILY_API_URL = "https://api.tavily.com/search";
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const JINA_API_URL = "https://s.jina.ai/";

export async function tavilyQuery(query: string, ak: string, depth?: boolean): Promise<{ link: string; content: string }[]> {
  
    try {
      console.log("Querying Tavily API with query:", query);
      const response = await fetch(TAVILY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          api_key: ak,
          search_depth: depth ? "advanced" : "basic",
          max_results: 5,
          include_raw_content: true, // To get the full parsed content
        }),
      });
  
      const data = await response.json();
  
      // Check if response data is valid
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        console.warn("No results returned from Tavily API");
        return [];
      }
  
      console.log("Results from Tavily API:", data);
  
      return data.results.map((result: any) => ({
        link: result.url,
        content: result.content, // Directly use the parsed content
      }));
    } catch (error) {
      console.error("Error querying Tavily API:", error);
      return [];
    }
}

export async function jinaQuery(query: string, ak: string): Promise<{ link: string; content: string }[]> {
  
    try {
      console.log("Querying Jina API:", query);
      const response = await fetch(`${JINA_API_URL}${encodeURIComponent(query)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${ak}`,
          "X-Retain-Images": "none",
        },
      });
  
      const data = await response.json();
  
      // Check if response data is valid
      if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        console.warn("No results returned from Jina API");
        return [];
      }
  
      console.log("Jina API Response:", data);
  
      return data.data.map((result: any) => ({
        link: result.url,
        content: result.content,
      }));
    } catch (error) {
      console.error("Error querying Jina API:", error);
      return [];
    }
}

export async function braveQuery(query: string, ak: string): Promise<{ link: string; markdown: string }[]> {
  
    try {
      console.log(`Querying Brave API with query: ${query}`);
      const response = await fetch(`${BRAVE_API_URL}?q=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": ak,
        },
      });
  
      const data = await response.json();
  
      // Check if response data is valid
      if (!data.web || !data.web.results) {
        console.warn("No web results returned from Brave API");
        return [];
      }
  
      console.log(`Received ${data.web.results.length} results from Brave API`);
      console.log(data);
  
      return data.web.results.map((result: any) => ({
        link: result.url,
        markdown: turndownService.turndown(result.description || ""),
      })).slice(0, 5);
    } catch (error) {
      console.error("Error querying Brave API:", error);
      return [];
    }
}

export async function exaQuery(query: string, ak: string): Promise<{link: string, markdown: string}[]>{
    const exa = new Exa(ak);
  
    try {
      const results = await exa.searchAndContents(query, {
        type: "neural",
        useAutoprompt: true,
        numResults: 5,
        text: true,
      });
  
      return results.results.map((result) => ({
        link: result.url,
        markdown: turndownService.turndown(result.text),
      }));
    } catch (error) {
      console.error("Error querying Exa API:", error);
      return [];
    }
}

/**
 * duckduckgoQuery:
 *  - Takes a query string
 *  - Uses duck-duck-scrape to perform a DuckDuckGo search
 *  - Returns up to 5 results with { link, content } shape
 */
export async function duckduckgoQuery(query: string): Promise<{ link: string; content: string }[]> {
  try {
    console.log(`Querying DuckDuckGo with query: "${query}"`);

    // Perform a DuckDuckGo search, e.g. strict safe search
    const ddgResults = await search(query, {
      safeSearch: SafeSearchType.STRICT,
      // optionally specify region, locales, etc.
    });

    // If no results found or results array is empty
    if (ddgResults.noResults || !ddgResults.results || ddgResults.results.length === 0) {
      console.warn("No results returned from DuckDuckGo search");
      return [];
    }

    console.log(`DuckDuckGo returned ${ddgResults.results.length} results`);

    // Convert each result to { link, content }, limiting to 5
    const finalResults = ddgResults.results.slice(0, 5).map((result: any) => {
      // 'snippet' is often HTML-ish, so we convert it to markdown or plain text
      const snippet = result.snippet || "";
      const content = turndownService.turndown(snippet);
      return {
        link: result.url || "",
        content,
      };
    });

    return finalResults;
  } catch (error) {
    console.error("Error querying DuckDuckGo:", error);
    return [];
  }
}