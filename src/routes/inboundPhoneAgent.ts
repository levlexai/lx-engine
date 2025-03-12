// routes/phoneAgentRoute.ts
import express from "express";
import { Request, Response } from "express";
import { callStates, updateJsonUsingLLM, getNextQuestion, gatherTwiML, hangupResponse, produceTTS } from "../agents/phone/agent";
import { PhoneAgentConfig } from "../agents/phone/agent";

// Define configuration for your phone agent (typically load from env)
const phoneAgentConfig: PhoneAgentConfig = {
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  fromNumber: process.env.TWILIO_FROM_NUMBER || "",
  ttsApiKey: process.env.REPLICATE_API_KEY || "",
  llmModel: {
    name: process.env.LLM_MODEL_NAME || "",
    base_url: process.env.LLM_BASE_URL || "",
    ak: process.env.LLM_API_KEY || "",
  },
};

// This is the overall prompt that describes the desired final JSON.
// For example, you might require the caller to provide { name, age, location }.
const promptForJson = "Please collect the caller's name, age, and location.";

// Create an Express router
const router = express.Router();

router.post("/call", async (req: Request, res: Response) => {
  // Extract call details from Twilio's POST payload
  const callSid = req.body.CallSid as string;
  const digits = req.body.Digits as string | undefined;
  const speechResult = req.body.SpeechResult as string | undefined;

  // Initialize state for this call if it doesn't exist
  if (!callStates[callSid]) {
    callStates[callSid] = {
      partialJson: {},
      done: false,
      lastQuestion: "",
    };
  }
  const state = callStates[callSid];

  // Get user input (either DTMF digits or speech recognition result)
  let userInput = (digits || speechResult || "").trim();

  // If we already asked a question and have user input, update the partial JSON.
  if (state.lastQuestion && userInput) {
    try {
      const updated = await updateJsonUsingLLM(
        state.partialJson,
        userInput,
        promptForJson,
        phoneAgentConfig.llmModel
      );
      state.partialJson = updated.newJson;
      state.done = updated.done;
      // If JSON is complete, respond with hangup.
      if (state.done) {
        return respondWithTwiML(
          res,
          hangupResponse("Thank you! Your data is complete. Goodbye.")
        );
      }
    } catch (err) {
      console.error("Error updating JSON:", err);
      return respondWithTwiML(
        res,
        hangupResponse("An error occurred. Goodbye.")
      );
    }
  }

  // Ask for the next question using the LLM.
  let nextQuestion = "";
  try {
    nextQuestion = await getNextQuestion(state.partialJson, phoneAgentConfig.llmModel);
  } catch (err) {
    console.error("Error getting next question:", err);
    return respondWithTwiML(
      res,
      hangupResponse("An error occurred generating the next question. Goodbye.")
    );
  }
  state.lastQuestion = nextQuestion;

  // Generate TTS audio for the next question.
  let audioUrl = "";
  try {
    audioUrl = await produceTTS(nextQuestion, phoneAgentConfig.ttsApiKey, 1, "af_bella");
    // Optionally, if your TTS output returns a public URL, you can use it directly.
    // Otherwise, you might want to store the audio and serve it from your domain.
  } catch (err) {
    console.error("TTS error:", err);
    return respondWithTwiML(
      res,
      gatherTwiML("An error occurred generating audio. Please enter digits.")
    );
  }

  // Build TwiML that <Play>s the TTS audio then <Gather>s input.
  const twiml = gatherTwiML(null, audioUrl);
  respondWithTwiML(res, twiml);
});

/**
 * Helper to send TwiML response
 */
function respondWithTwiML(res: Response, twiml: string) {
  res.type("text/xml");
  res.send(twiml);
}

// Export the router so it can be mounted in your main server.
export default router;
