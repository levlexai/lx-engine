// routes/outboundPhoneAgent.ts

import express from "express";
import { Request, Response } from "express";
import { Twilio } from "twilio";
import {
  callStates,
  updateJsonUsingLLM,
  getNextQuestion,
  gatherTwiML,
  hangupResponse,
  produceTTS,
} from "../agents/phone/agent";
import { PhoneAgentConfig } from "../agents/phone/agent";

const router = express.Router();

/** 
 * Example config for the phone agent 
 * (In production, load from env or pass in from a separate config.)
 */
const phoneAgentConfig: PhoneAgentConfig = {
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  fromNumber: process.env.TWILIO_FROM_NUMBER || "",
  ttsApiKey: process.env.REPLICATE_API_KEY || "",
  llmModel: {
    name: process.env.LLM_MODEL_NAME || "gpt-4o-2024-08-06",
    base_url: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    ak: process.env.LLM_API_KEY || "",
  },
};

// Our overall prompt describing the final JSON we want
const promptForJson = "Please collect the caller's name, age, and location.";

/**
 * 1) Start an outbound call by calling the Twilio REST API.
 * The user supplies a `to` phone number in the request body or query.
 * Twilio will dial out from `fromNumber` to that number, 
 * and when answered, Twilio will request /outbound/call below.
 */
router.post("/startCall", async (req: Request, res: any) => {
  try {
    const toNumber = req.body.to || req.query.to;
    if (!toNumber) {
      return res.status(400).json({ error: "No 'to' phone number provided." });
    }

    const client = new Twilio(
      phoneAgentConfig.twilioAccountSid,
      phoneAgentConfig.twilioAuthToken
    );

    // Create the call
    const call = await client.calls.create({
      to: toNumber,
      from: phoneAgentConfig.fromNumber,
      url: "<YOUR_HOST>/outbound/call",
      // e.g. "https://mydomain.com/outbound/call"
      // This is the TwiML handler for conversation flow
    });

    return res.json({ success: true, callSid: call.sid });
  } catch (err) {
    console.error("Error starting outbound call:", err);
    return res.status(500).json({ error: "Error starting outbound call." });
  }
});

/**
 * 2) The Twilio inbound webhook for outbound calls. 
 *    (When the call is answered, Twilio hits this endpoint.)
 *    This is almost identical to your inbound "call" logic.
 */
router.post("/call", async (req: Request, res: Response) => {
  const callSid = req.body.CallSid as string;
  const digits = req.body.Digits as string | undefined;
  const speechResult = req.body.SpeechResult as string | undefined;

  // If we have no call state, init it
  if (!callStates[callSid]) {
    callStates[callSid] = {
      partialJson: {},
      done: false,
      lastQuestion: "",
    };
  }
  const state = callStates[callSid];

  // Gather user input
  let userInput = (digits || speechResult || "").trim();

  // If there's a last question and user input, update partial JSON
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

  // Not done => get the next question
  let nextQuestion = "";
  try {
    nextQuestion = await getNextQuestion(
      state.partialJson,
      phoneAgentConfig.llmModel
    );
  } catch (err) {
    console.error("Error generating next question:", err);
    return respondWithTwiML(
      res,
      hangupResponse("An error occurred generating next question. Goodbye.")
    );
  }
  state.lastQuestion = nextQuestion;

  // Generate TTS audio for next question
  let audioUrl = "";
  try {
    audioUrl = await produceTTS(nextQuestion, phoneAgentConfig.ttsApiKey, 1, "af_bella");
  } catch (err) {
    console.error("TTS error:", err);
    return respondWithTwiML(
      res,
      gatherTwiML("Failed to generate audio. Please enter digits.")
    );
  }

  // Build TwiML: <Play> audio, then <Gather>
  const twiml = gatherTwiML(null, audioUrl);
  respondWithTwiML(res, twiml);
});

/** TwiML response helper */
function respondWithTwiML(res: Response, twiml: string) {
  res.type("text/xml");
  res.send(twiml);
}

export default router;
