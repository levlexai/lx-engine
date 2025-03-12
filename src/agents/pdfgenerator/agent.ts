// ██████╗░██████╗░███████╗░░░░░░░██████╗░███████╗███╗░░██╗
// ██╔══██╗██╔══██╗██╔════╝░░░░░░██╔════╝░██╔════╝████╗░██║
// ██████╔╝██║░░██║█████╗░░█████╗██║░░██╗░█████╗░░██╔██╗██║
// ██╔═══╝░██║░░██║██╔══╝░░╚════╝██║░░╚██╗██╔══╝░░██║╚████║
// ██║░░░░░██████╔╝██║░░░░░░░░░░░╚██████╔╝███████╗██║░╚███║
// ╚═╝░░░░░╚═════╝░╚═╝░░░░░░░░░░░░╚═════╝░╚══════╝╚═╝░░╚══╝

// ░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// PDF Generator Agent

import PDFDocument from "pdfkit";
import { promptLlmWithSchemaAndConversation, promptLlm } from "../../utils/promptLlm";
import { PdfGeneratorRequest, PdfGeneratorOutput } from "../../interfaces";
import { z } from "zod";

// --------------------------------------------------------------------
// Schema Definitions for the PDF Agent
// --------------------------------------------------------------------

// Outline schema: defines page defaults and sections.
const PdfOutlineSchema = z.object({
  backgroundColor: z.string(), // e.g., "#FFFFFF"
  textColor: z.string(),       // e.g., "#000000"
  columns: z.enum(["single", "double"]),
  margin: z.number(),          // margin in inches
  sections: z.array(
    z.object({
      title: z.string(),
      // Optionally, the outline may include instructions for the section.
      instructions: z.string().optional(),
    })
  ),
});

// Content schema for one section.
// The LLM is asked to generate an array of elements.
// Here we support two types: "heading" and "paragraph".
const PdfSectionContentSchema = z.object({
  content: z.array(
    z.discriminatedUnion("elementType", [
      z.object({
        elementType: z.literal("heading"),
        parameters: z.object({
          text: z.string(),
          fontSize: z.number().optional(),
          fontWeight: z.string().optional(),
          italics: z.boolean().optional(),
          underline: z.boolean().optional(),
          color: z.string().optional(),
        }),
      }),
      z.object({
        elementType: z.literal("paragraph"),
        parameters: z.object({
          text: z.string(),
          fontSize: z.number().optional(),
          fontWeight: z.string().optional(),
          italics: z.boolean().optional(),
          underline: z.boolean().optional(),
          color: z.string().optional(),
        }),
      }),
    ])
  ),
});

// --------------------------------------------------------------------
// PDF Element Helper Functions
// --------------------------------------------------------------------
function addHeading(doc: PDFKit.PDFDocument, params: any, defaultColor: string) {
  const fontSize = params.fontSize || 32;
  const color = params.color || defaultColor;
  // PDFKit doesn't have a direct "bold" toggle; use a bold font variant.
  doc.fillColor(color)
    .font("Helvetica-Bold")
    .fontSize(fontSize)
    .text(params.text, { align: "left" });
  doc.moveDown();
}

function addParagraph(doc: PDFKit.PDFDocument, params: any, defaultColor: string) {
  const fontSize = params.fontSize || 14;
  const color = params.color || defaultColor;
  doc.fillColor(color)
    .font("Helvetica")
    .fontSize(fontSize)
    .text(params.text, { align: "left" });
  doc.moveDown();
}

// --------------------------------------------------------------------
// Main PDF Generator Agent Function
// --------------------------------------------------------------------
export async function runPdfGenAgent(request: PdfGeneratorRequest): Promise<PdfGeneratorOutput> {
  const { prompt, model } = request;

  // --- Phase 1: Generate Outline ---
  const outlinePrompt = `
You are an expert document designer.
Generate a PDF presentation outline for the topic: "${prompt}".
Include:
  - A default background color (in hex, e.g. "#FFFFFF"),
  - A default text color (in hex, e.g. "#000000"),
  - A column layout ("single" or "double"),
  - A margin size (in inches),
  - And a list of sections, each with a title.
Output strictly as valid JSON following this schema:
{
  "backgroundColor": string,
  "textColor": string,
  "columns": "single" | "double",
  "margin": number,
  "sections": [
    { "title": string }
  ]
}
  `;
  const outlineConversation = [
    { role: "system" as "system", content: "You are an expert presentation designer." },
    { role: "user" as "user", content: outlinePrompt },
  ];
  let outlineResult;
  try {
    outlineResult = await promptLlmWithSchemaAndConversation(model, outlineConversation, PdfOutlineSchema);
  } catch (error) {
    throw new Error("Error generating PDF outline: " + error);
  }
  const { backgroundColor, textColor, columns, margin, sections } = outlineResult;

  // --- Phase 2: Generate Section Content ---
  // For each section, generate content elements.
  const sectionsContent: Array<{ title: string; content: any[] }> = [];
  for (const sec of sections) {
    const sectionPrompt = `
For the section titled "${sec.title}", generate content.
Divide the section into multiple elements. Each element can be:
- A heading: with text and optional formatting options (fontSize, fontWeight, italics, underline, color).
- A paragraph: with text and optional formatting options.
Output strictly as valid JSON following this schema:
{
  "content": [
    {
      "elementType": "heading" | "paragraph",
      "parameters": {
         "text": string,
         "fontSize": number (optional),
         "fontWeight": string (optional),
         "italics": boolean (optional),
         "underline": boolean (optional),
         "color": string (optional)
      }
    },
    ...
  ]
}
    `;
    const sectionConversation = [
      { role: "system" as "system", content: "You are an expert content generator for documents." },
      { role: "user" as "user", content: sectionPrompt },
    ];
    let sectionContentResult;
    try {
      sectionContentResult = await promptLlmWithSchemaAndConversation(model, sectionConversation, PdfSectionContentSchema);
    } catch (error) {
      throw new Error(`Error generating content for section "${sec.title}": ` + error);
    }
    sectionsContent.push({ title: sec.title, content: sectionContentResult.content });
  }

  // --- Phase 3: Build the PDF using PDFKit ---
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: margin, bottom: margin, left: margin, right: margin },
  });
  // We will collect the PDF output in a Buffer.
  const buffers: Buffer[] = [];
  doc.on("data", (chunk) => buffers.push(chunk));
  const pdfGenerationPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  // For a background color, fill a rectangle that covers the entire page.
  const { width, height } = doc.page;
  doc.rect(0, 0, width, height).fill(backgroundColor);
  // Set default text color.
  doc.fillColor(textColor);

  // For each section, add a new page.
  sectionsContent.forEach((secContent, index) => {
    if (index > 0) doc.addPage();
    // Add section title as a heading.
    doc.font("Helvetica-Bold").fontSize(24).text(secContent.title, { align: "center" });
    doc.moveDown();
    // For each element, add it to the page.
    secContent.content.forEach((element) => {
      if (element.elementType === "heading") {
        addHeading(doc, element.parameters, textColor);
      } else if (element.elementType === "paragraph") {
        addParagraph(doc, element.parameters, textColor);
      }
      // Additional element types (e.g., charts) can be added here.
    });
  });

  doc.end();
  let buffer: Buffer;
  try {
    buffer = await pdfGenerationPromise;
  } catch (err) {
    throw new Error("Error generating PDF file: " + err);
  }

  return { pdf: buffer };
}
