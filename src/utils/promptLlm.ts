
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export interface Model{
    name: string;
    base_url: string;
    ak: string;
}

export async function promptLlmWithJsonSchema(
    model: Model,
    prompt: string,
    outputSchema: z.ZodSchema<any>, // zod schema
  ): Promise<any> {
    // Initialize the OpenAI SDK instance using your model's API key and base URL.
    const openai = new OpenAI({
      apiKey: model.ak,
      baseURL: model.base_url,
    });
  
    // Call the chat completion API with Structured Outputs.
    // The response_format uses zodResponseFormat to ensure the response adheres to outputSchema.
    const completion = await openai.beta.chat.completions.parse({
      model: model.name,
      messages: [
        {
          role: "system",
          content: "Generate a response that adheres strictly to the provided JSON schema.",
        },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(outputSchema, "output"),
    });
  
    // If the model returns a refusal, you can handle it accordingly.
    if (completion.choices[0].message.refusal) {
      throw new Error(`Model refused the request: ${completion.choices[0].message.refusal}`);
    }
  
    // Return the parsed (and schema-validated) output.
    return completion.choices[0].message.parsed;
  }
  
  export async function promptLlmJsonOutput(prompt: string, model: Model): Promise<any> {
    // Create an instance of the OpenAI SDK (ensure OPENAI_API_KEY is set in your env)
    const openai = new OpenAI({
      apiKey: model.ak,
      baseURL: model.base_url,
    });
  
    // Call the Chat Completion API with instructions to output only valid JSON.
    const completion = await openai.chat.completions.create({
      model: model.name, // or another supported model
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Please output your answer strictly as valid JSON without any additional text, commentary, or markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      // This instructs the model to produce valid JSON output.
      response_format: { type: "json_object" },
    });
  
    // Extract the content from the response.
    const content = completion.choices[0].message.content;
  
    try {
      // Attempt to parse the returned JSON.
      return JSON.parse(content!);
    } catch (err) {
      throw new Error("Failed to parse LLM output as JSON: " + err);
    }
}

export async function promptLlm(prompt: string, model: Model): Promise<string> {
    const openai = new OpenAI({
      apiKey: model.ak,
      baseURL: model.base_url,
    });
  
    // Call the Chat Completion API without forcing a JSON response.
    const completion = await openai.chat.completions.create({
      model: model.name,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        { role: "user", content: prompt },
      ],
    });
  
    // Return the content of the assistant's reply, or an empty string if not provided.
    return completion.choices[0].message.content || "";
}

export async function promptLlmWithSchemaAndConversation(
  model: Model,
  messages: Array<{ role: "system" | "user" | "assistant"; content: any }>,
  outputSchema: z.ZodObject<any>
): Promise<any> {
  const openai = new OpenAI({
    apiKey: model.ak,
    baseURL: model.base_url,
  });

  const completion = await openai.beta.chat.completions.parse({
    model: model.name,
    messages, // messages can include objects with content as an array of message parts (text and image)
    response_format: zodResponseFormat(outputSchema, "output"),
  });

  if (completion.choices[0].message.refusal) {
    throw new Error(`Model refused the request: ${completion.choices[0].message.refusal}`);
  }

  return completion.choices[0].message.parsed;
}