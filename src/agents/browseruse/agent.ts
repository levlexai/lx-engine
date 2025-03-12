// ██████╗░██████╗░░█████╗░░██╗░░░░░░░██╗░██████╗███████╗██████╗░  ██╗░░░██╗░██████╗███████╗
// ██╔══██╗██╔══██╗██╔══██╗░██║░░██╗░░██║██╔════╝██╔════╝██╔══██╗  ██║░░░██║██╔════╝██╔════╝
// ██████╦╝██████╔╝██║░░██║░╚██╗████╗██╔╝╚█████╗░█████╗░░██████╔╝  ██║░░░██║╚█████╗░█████╗░░
// ██╔══██╗██╔══██╗██║░░██║░░████╔═████║░░╚═══██╗██╔══╝░░██╔══██╗  ██║░░░██║░╚═══██╗██╔══╝░░
// ██████╦╝██║░░██║╚█████╔╝░░╚██╔╝░╚██╔╝░██████╔╝███████╗██║░░██║  ╚██████╔╝██████╔╝███████╗
// ╚═════╝░╚═╝░░╚═╝░╚════╝░░░░╚═╝░░░╚═╝░░╚═════╝░╚══════╝╚═╝░░╚═╝  ░╚═════╝░╚═════╝░╚══════╝

// ░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Browser Use Agent

// Notes
// - Works best with long-context models
// - Requires multimodal model

import { BrowserAgentRequest, BrowserAgentOutput, BrowserAgentActions, Model } from "../../interfaces";
import { Page, chromium } from "playwright";
import { z } from "zod";
import { promptLlmWithSchemaAndConversation } from "../../utils/promptLlm";

// --------------------------------------------------------------------
// Schemas
// --------------------------------------------------------------------
// Browser action schema supports granular commands.
const BrowserActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("click"),
    parameters: z.object({
      x: z.number(),
      y: z.number(),
    }),
  }),
  z.object({
    action: z.literal("scroll"),
    parameters: z.object({
      amount: z.number(),
    }),
  }),
  z.object({
    action: z.literal("type"),
    parameters: z.object({
      // Make selector optional so that if omitted, we default to the last clicked element.
      selector: z.string().optional(),
      text: z.string(),
    }),
  }),
  z.object({
    action: z.literal("navigate"),
    parameters: z.object({
      url: z.string(),
    }),
  }),
  z.object({
    action: z.literal("finish"),
    parameters: z.object({}).optional(),
  }),
]);

// We wrap the schema so that promptLlmWithSchemaAndConversation expects an object.
const BrowserActionSchemaWrapper = z.object({
  action: BrowserActionSchema,
});

// Schema for the conclusion response.
const ConclusionSchema = z.object({
  conclusion: z.string(),
});

// --------------------------------------------------------------------
// Browser Control Utility Functions
// --------------------------------------------------------------------
export async function clickCoordinates(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y);
}

export async function scrollPage(page: Page, amount: number): Promise<void> {
  await page.evaluate((scrollAmount) => window.scrollBy(0, scrollAmount), amount);
}

export async function typeText(page: Page, selector: string, text: string): Promise<void> {
  // Use fill to replace content.
  await page.fill(selector, text);
}

export async function navigatePage(page: Page, url: string): Promise<void> {
  await page.goto(url);
}

// Helper: get a simple descriptor for the currently focused element.
async function getActiveElementDescriptor(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const active = document.activeElement;
    if (!active) return "";
    const tag = active.tagName.toLowerCase();
    const id = active.id ? `#${active.id}` : "";
    const classList = active.className ? "." + active.className.replace(/\s+/g, ".") : "";
    return tag + id + classList;
  });
}

// --------------------------------------------------------------------
// Main Browser Agent Function
// --------------------------------------------------------------------
export async function runBrowserUseAgent(request: BrowserAgentRequest): Promise<BrowserAgentOutput> {
  const { prompt, model } = request;
  const maxSteps = request.maxSteps || 25;  
  let step = 0;
  let finished = false;
  const actions: BrowserAgentActions[] = [];
  let lastClickedSelector: string = "";

  // Launch Playwright browser in headless mode.
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  // Navigate to a starting URL.
  await page.goto("https://example.com");

  while (!finished && step < maxSteps) {
    // Get a screenshot (PNG) and convert it to a Base64 string.
    const screenshotBuffer = await page.screenshot({ type: "png" });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Build the conversation for the LLM.  
    // If we have a last clicked element, include that context.
    const contextLines = [
      { type: "text", text: "You are a browser automation agent with granular control." },
      { type: "text", text: "Below is a screenshot of the current browser state (Base64 encoded):" },
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${screenshotBase64}`, detail: "low" },
      },
    ];
    if (lastClickedSelector) {
      contextLines.push({ type: "text", text: `The last element clicked (and currently focused) is: ${lastClickedSelector}` });
    }
    // (Optionally, you could include HTML content if needed.)
    contextLines.push(
      { type: "text", text: "Based on the above, decide the next action. Your response must be valid JSON following this schema:" },
      { type: "text", text: `{
  "action": "click" | "scroll" | "type" | "navigate" | "finish",
  "parameters": {
    // For "click": { "x": number, "y": number }
    // For "scroll": { "amount": number }
    // For "type": { "selector": string (optional), "text": string }
    // For "navigate": { "url": string }
    // For "finish": {}
  }
}` }
    );

    const conversation = [
      { role: "system" as "system", content: contextLines },
      { role: "user" as "user", content: [{ type: "text", text: `User prompt: "${prompt}". Please specify the next browser action.` }] },
    ];

    // Request the next action from the LLM.
    let actionResponse;
    try {
      actionResponse = await promptLlmWithSchemaAndConversation(model, conversation, BrowserActionSchemaWrapper);
    } catch (error) {
      console.error("Error obtaining action from LLM:", error);
      break;
    }

    // Record the action.
    actions.push({
      action: JSON.stringify(actionResponse),
      screenshot: screenshotBase64,
    });

    // Execute the action.
    if (actionResponse.action === "click") {
      const { x, y } = actionResponse.parameters;
      await clickCoordinates(page, x, y);
      // After clicking, retrieve a descriptor for the focused element.
      lastClickedSelector = await getActiveElementDescriptor(page);
    } else if (actionResponse.action === "scroll") {
      const { amount } = actionResponse.parameters;
      await scrollPage(page, amount);
    } else if (actionResponse.action === "type") {
      let { selector, text } = actionResponse.parameters;
      // If the model omitted the selector, default to the last clicked element.
      if (!selector && lastClickedSelector) {
        selector = lastClickedSelector;
      }
      if (selector) {
        await typeText(page, selector, text);
      } else {
        console.error("No selector provided for type action, and no last clicked element available.");
      }
    } else if (actionResponse.action === "navigate") {
      const { url } = actionResponse.parameters;
      await navigatePage(page, url);
      // Reset last clicked selector on navigation.
      lastClickedSelector = "";
    } else if (actionResponse.action === "finish") {
      finished = true;
      break;
    }

    // Wait for page changes to settle.
    await page.waitForTimeout(2000);
    step++;
  }

  // Capture a final screenshot.
  const finalScreenshotBuffer = await page.screenshot({ type: "png" });
  const finalScreenshotBase64 = finalScreenshotBuffer.toString("base64");

  // Build an actions summary.
  let actionsSummary = "";
  actions.forEach((act, idx) => {
    actionsSummary += `[${idx + 1}] Action: ${act.action}\n`;
  });

  // Build the conclusion conversation using the proper image input format.
  const conclusionConversation = [
    {
      role: "system" as "system",
      content: [
        { type: "text", text: "You are an expert browser session reviewer." },
        { type: "text", text: "Below is the final screenshot of the browser state (Base64 encoded):" },
        { type: "image_url", image_url: { url: `data:image/png;base64,${finalScreenshotBase64}`, detail: "low" } },
        { type: "text", text: "Below is a summary of the actions taken during the session:" },
        { type: "text", text: actionsSummary },
        { type: "text", text: "Based on the above, provide a comprehensive conclusion summarizing what was accomplished." }
      ],
    },
    {
      role: "user" as "user",
      content: [
        { type: "text", text: "Please output your conclusion as plain text within a JSON object using the following schema: { \"conclusion\": string }" }
      ],
    },
  ];

  let conclusionResponse;
  try {
    conclusionResponse = await promptLlmWithSchemaAndConversation(model, conclusionConversation, ConclusionSchema);
  } catch (error) {
    console.error("Error obtaining conclusion from LLM:", error);
    conclusionResponse = { conclusion: "Unable to generate conclusion." };
  }

  await browser.close();

  return {
    actions,
    conclusion: conclusionResponse.conclusion,
  };
}