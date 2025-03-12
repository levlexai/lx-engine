// ██████╗░░█████╗░░█████╗░██╗░░░██╗░█████╗░██╗░░██╗░█████╗░████████╗
// ██╔══██╗██╔══██╗██╔══██╗██║░░░██║██╔══██╗██║░░██║██╔══██╗╚══██╔══╝
// ██║░░██║██║░░██║██║░░╚═╝██║░░░██║██║░░╚═╝███████║███████║░░░██║░░░
// ██║░░██║██║░░██║██║░░██╗██║░░░██║██║░░██╗██╔══██║██╔══██║░░░██║░░░
// ██████╔╝╚█████╔╝╚█████╔╝╚██████╔╝╚█████╔╝██║░░██║██║░░██║░░░██║░░░
// ╚═════╝░░╚════╝░░╚════╝░░╚═════╝░░╚════╝░╚═╝░░╚═╝╚═╝░░╚═╝░░░╚═╝░░░
// Document Chat Agent

import { DocuchatRequest } from "../../interfaces";
import { promptLlm } from "../../utils/promptLlm";
import pdfParse from "pdf-parse";

export async function runDocuchatAgent(request: DocuchatRequest): Promise<string> {
  const { prompt, document, model } = request;
  
  // 'document' is expected to be a Buffer containing PDF data.
  let pdfText: string;
  try {
    const pdfData = await pdfParse(document);
    pdfText = pdfData.text;
  } catch (error) {
    throw new Error("Error parsing PDF: " + error);
  }
  
  // Build a comprehensive prompt that includes the extracted PDF text and the user's query.
  const finalPrompt = `
You are a helpful assistant that uses the content of a PDF document to answer user queries.
Below is the extracted content from the PDF document, followed by the user query.
Please provide a clear, detailed answer that references relevant portions of the document if appropriate.

PDF Document Content:
${pdfText}

User Query:
${prompt}
  `;
  
  // Generate the final answer using your promptLlm function.
  const llmResponse = await promptLlm(finalPrompt, model);
  return llmResponse.trim();
}
