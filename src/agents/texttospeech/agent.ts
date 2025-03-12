// ████████╗████████╗░██████╗░░░░░░░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ╚══██╔══╝╚══██╔══╝██╔════╝░░░░░░██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ░░░██║░░░░░░██║░░░╚█████╗░█████╗███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ░░░██║░░░░░░██║░░░░╚═══██╗╚════╝██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ░░░██║░░░░░░██║░░░██████╔╝░░░░░░██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ░░░╚═╝░░░░░░╚═╝░░░╚═════╝░░░░░░░╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Text To Speech Agent

import { TextToSpeechRequest, TextToSpeechOutput } from "../../interfaces";
import Replicate from "replicate";

export async function textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechOutput> {

    const { prompt, ak, speed, voice } = request;

    const replicate = new Replicate({
        auth: ak,
    });

    const output = await replicate.run(
        "jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13",
        {
          input: {
            text: prompt,
            speed: speed ?? 1,
            voice: voice ?? "af_bella"
          }
        }
    );

    const audioUrl = (output as any).output[0];
    const response = await fetch(audioUrl);
    const buffer = await response.arrayBuffer();

    return { audio: Buffer.from(buffer) };
      
}