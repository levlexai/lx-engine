import { z } from "zod";
import { CodeAgentRequest, CodeAgentResponse, RanCode } from "../../interfaces";
import { promptLlmWithJsonSchema } from "../../utils/promptLlm";
import { runPythonCode, runJSCode } from "../../utils/runcode";

/**
 * codeDecisionSchema:
 * LLM must decide either to run code or finish with a conclusion
 */
const codeDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("run"),
    code: z.string(), // code snippet
  }),
  z.object({
    action: z.literal("finish"),
    conclusion: z.string(), // final conclusion text
  }),
]);

export async function runCodeAgent(
  request: CodeAgentRequest
): Promise<CodeAgentResponse> {
  const {
    prompt,
    model,
    max_recursion = 10,
    language = "javascript",
  } = request;

  // We'll store each code snippet and output in this array
  const ranCodeArray: RanCode[] = [];

  // The loop function
  async function codeIteration(currentPrompt: string, recursionCount: number): Promise<string> {
    if (recursionCount >= max_recursion) {
      // If we've recursed enough times, let's just finalize by returning the prompt
      // or you could run a final "conclusion" prompt
      return `Max recursion reached. Stopping. Current prompt: ${currentPrompt}`;
    }

    // 1) Use promptLlmWithJsonSchema to decide if we run code or finish
    // We'll pass the code so far, outputs so far, plus the user's main prompt.
    const iterationPrompt = `
You are a coding agent. You can either produce ${language} code to run or finalize with a conclusion.
We have the following overall user prompt: "${prompt}"

Here is the partial code-and-output history so far:
${ranCodeArray
  .map((rc, idx) => `Code #${idx + 1}:\n${rc.code}\nOutput:\n${rc.output}\n`)
  .join("\n")}
Current iteration user prompt or instructions: "${currentPrompt}"

IMPORTANT: You do not have access to previously ran functions or variables. Your code is ran in a sandboxed environment.

Return strictly valid JSON, matching either:
{
  "action": "run",
  "code": "<some snippet>"
}
OR
{
  "action": "finish",
  "conclusion": "<some final text>"
}
No extra keys or commentary.
`.trim();

    const decision = await promptLlmWithJsonSchema(model, iterationPrompt, codeDecisionSchema);

    // 2) If action = "run", we run the code, store output, continue
    if (decision.action === "run") {
      const snippet = decision.code;
      let output = "";
      try {
        if (language === "python") {
          // run the snippet as python, store in output
          output = await runPythonCode(snippet);
        } else {
          // run as JavaScript
          output = await runJSCode(snippet);
        }
      } catch (err: any) {
        output = `Error running code: ${String(err)}`;
      }
      // store in the array
      ranCodeArray.push({ code: snippet, output });
      // Recurse with updated prompt context
      return codeIteration(currentPrompt, recursionCount + 1);
    } else {
      // 3) If action = "finish"
      return decision.conclusion;
    }
  }

  const finalConclusion = await codeIteration(prompt, 0);

  // Return final
  const response: CodeAgentResponse = {
    conclusion: finalConclusion,
    rancode: ranCodeArray,
  };
  return response;
}
