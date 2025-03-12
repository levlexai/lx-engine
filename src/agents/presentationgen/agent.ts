// ██████╗░██████╗░███████╗░██████╗███████╗███╗░░██╗████████╗░█████╗░████████╗██╗░█████╗░███╗░░██╗
// ██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝████╗░██║╚══██╔══╝██╔══██╗╚══██╔══╝██║██╔══██╗████╗░██║
// ██████╔╝██████╔╝█████╗░░╚█████╗░█████╗░░██╔██╗██║░░░██║░░░███████║░░░██║░░░██║██║░░██║██╔██╗██║
// ██╔═══╝░██╔══██╗██╔══╝░░░╚═══██╗██╔══╝░░██║╚████║░░░██║░░░██╔══██║░░░██║░░░██║██║░░██║██║╚████║
// ██║░░░░░██║░░██║███████╗██████╔╝███████╗██║░╚███║░░░██║░░░██║░░██║░░░██║░░░██║╚█████╔╝██║░╚███║
// ╚═╝░░░░░╚═╝░░╚═╝╚══════╝╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░╚═╝░░╚═╝░░░╚═╝░░░╚═╝░╚════╝░╚═╝░░╚══╝

// ░██████╗░███████╗███╗░░██╗░░░░░░░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██╔════╝░██╔════╝████╗░██║░░░░░░██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ██║░░██╗░█████╗░░██╔██╗██║█████╗███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██║░░╚██╗██╔══╝░░██║╚████║╚════╝██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ╚██████╔╝███████╗██║░╚███║░░░░░░██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ░╚═════╝░╚══════╝╚═╝░░╚══╝░░░░░░╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Presentation Gen Agent

import PptxGenJS from "pptxgenjs";
import { promptLlmWithSchemaAndConversation } from "../../utils/promptLlm";
import { PresentationGeneratorRequest, PresentationGeneratorOutput } from "../../interfaces";
import { z } from "zod";

// --------------------------------------------------------------------
// Schema Definitions
// --------------------------------------------------------------------

// Schema for generating the overall slide deck outline.
const SlideOutlineSchema = z.object({
  backgroundColor: z.string(), // e.g. "#FFFFFF"
  textColor: z.string(),       // e.g. "#000000"
  slides: z.array(
    z.object({
      title: z.string(),
    })
  ),
});

// Schema for a single quadrant element.
// Supported element types are "heading", "paragraph" (for text) and "chart".
const SlideElementSchema = z.discriminatedUnion("elementType", [
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
  z.object({
    elementType: z.literal("chart"),
    parameters: z.object({
      chartType: z.enum(["line", "bar", "pie"]),
      data: z.any(), // Data should be provided in a format compatible with PptxGenJS
      options: z.any().optional(),
    }),
  }),
]);

// Schema for the content of one quadrant.
const SlideQuadrantSchema = z.object({
  quadrant: z.enum(["TL", "TR", "BL", "BR"]),
  element: SlideElementSchema,
});

// Schema for generating all four quadrants for a slide.
const SlideContentSchema = z.object({
  quadrants: z.array(SlideQuadrantSchema).length(4),
});

// --------------------------------------------------------------------
// Utility Functions to Add Elements to Slides
// --------------------------------------------------------------------

// Define fixed positions (in inches) for the four quadrants.
const quadrantPositions: Record<"TL" | "TR" | "BL" | "BR", { x: number; y: number; w: number; h: number }> = {
  TL: { x: 0.5, y: 0.8, w: 4, h: 3 },
  TR: { x: 5, y: 0.8, w: 4, h: 3 },
  BL: { x: 0.5, y: 4, w: 4, h: 3 },
  BR: { x: 5, y: 4, w: 4, h: 3 },
};

function addTextElement(slide: any, quadrant: "TL" | "TR" | "BL" | "BR", params: any, defaultTextColor: string) {
  const pos = quadrantPositions[quadrant];
  const opts = {
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    fontSize: params.fontSize || 24,
    color: params.color || defaultTextColor,
    bold: params.fontWeight === "bold",
    italic: params.italics || false,
    underline: params.underline || false,
  };
  slide.addText(params.text, opts);
}

function addChartElement(pptx: PptxGenJS, slide: any, quadrant: "TL" | "TR" | "BL" | "BR", params: any) {
  const pos = quadrantPositions[quadrant];
  const opts = { x: pos.x, y: pos.y, w: pos.w, h: pos.h };
  // Depending on chartType, add the chart.
  if (params.chartType === "line") {
    slide.addChart(pptx.ChartType.line, params.data, opts);
  } else if (params.chartType === "bar") {
    slide.addChart(pptx.ChartType.bar, params.data, opts);
  } else if (params.chartType === "pie") {
    slide.addChart(pptx.ChartType.pie, params.data, opts);
  }
}

function addElementToSlide(pptx: PptxGenJS, slide: any, quadrant: "TL" | "TR" | "BL" | "BR", elementObj: any, defaultTextColor: string) {
  if (elementObj.elementType === "heading" || elementObj.elementType === "paragraph") {
    addTextElement(slide, quadrant, elementObj.parameters, defaultTextColor);
  } else if (elementObj.elementType === "chart") {
    addChartElement(pptx, slide, quadrant, elementObj.parameters);
  }
}

// --------------------------------------------------------------------
// Main Presentation Generator Agent Function
// --------------------------------------------------------------------
export async function runPresentationGeneratorAgent(
  request: PresentationGeneratorRequest
): Promise<PresentationGeneratorOutput> {
  const { prompt, model } = request;

  // Step 1: Generate the slide deck outline.
  const outlinePrompt = `
Generate a slide deck outline for a presentation on the topic: "${prompt}".
Include a default background color and a default text color (in hex, e.g., "#FFFFFF" for white) that will be applied to all slides.
Also generate a list of slides, each with a title.
Output strictly as valid JSON following this schema:
{
  "backgroundColor": string,
  "textColor": string,
  "slides": [
    { "title": string },
    ...
  ]
}
  `;
  const outlineConversation = [
    { role: "system" as "system", content: "You are an expert presentation designer." },
    { role: "user" as "user", content: outlinePrompt },
  ];
  let outlineResult;
  try {
    outlineResult = await promptLlmWithSchemaAndConversation(model, outlineConversation, SlideOutlineSchema);
  } catch (error) {
    throw new Error("Error generating slide outline: " + error);
  }
  const { backgroundColor, textColor, slides } = outlineResult;

  // Initialize the presentation.
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  // Step 2: For each slide, generate and add content.
  for (let i = 0; i < slides.length; i++) {
    const slideInfo = slides[i];
    const slide = pptx.addSlide();
    // Apply background color.
    slide.background = { fill: backgroundColor };

    // Add slide title.
    slide.addText(slideInfo.title, { x: 0.3, y: 0.2, w: 9, h: 0.6, fontSize: 28, bold: true, color: textColor });

    // Generate content for the four quadrants of the slide.
    const slidePrompt = `
For the slide titled "${slideInfo.title}", generate content for four sections (quadrants): TL, TR, BL, and BR.
Each section should contain exactly one element.
An element can be one of:
- A heading: with text and optional formatting (fontSize, fontWeight, italics, underline, color).
- A paragraph: similar to heading but for longer text.
- A chart: specify a chart type (line, bar, or pie) along with the necessary data.
Output strictly as valid JSON following this schema:
{
  "quadrants": [
    {
      "quadrant": "TL" | "TR" | "BL" | "BR",
      "element": {
         "elementType": "heading" | "paragraph" | "chart",
         "parameters": { ... }
      }
    },
    ... (four items total, in the order TL, TR, BL, BR)
  ]
}
    `;
    const slideConversation = [
      { role: "system" as "system", content: "You are an expert presentation designer specialized in slide layouts." },
      { role: "user" as "user", content: slidePrompt },
    ];
    let slideContentResult;
    try {
      slideContentResult = await promptLlmWithSchemaAndConversation(model, slideConversation, SlideContentSchema);
    } catch (error) {
      throw new Error("Error generating slide content: " + error);
    }
    const quadrants: any[] = slideContentResult.quadrants;
    // For each quadrant, add the element to the slide.
    quadrants.forEach((quad) => {
      addElementToSlide(pptx, slide, quad.quadrant, quad.element, textColor);
    });
  }


    
  // Step 3: Generate the final presentation file.
  // Write the presentation as a Node Buffer.
  const buffer: Buffer = await pptx.write({outputType: "nodebuffer"}) as Buffer;
  return { presentation: buffer };
//   const arrayBuffer = await pptx.write({outputType: "arraybuffer"});
//   const buffer = Buffer.from(arrayBuffer);
//   return { presentation: buffer };
}
