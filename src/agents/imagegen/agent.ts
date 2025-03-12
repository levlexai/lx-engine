// ██╗███╗░░░███╗░█████╗░░██████╗░███████╗░░░░░░░██████╗░███████╗███╗░░██╗  
// ██║████╗░████║██╔══██╗██╔════╝░██╔════╝░░░░░░██╔════╝░██╔════╝████╗░██║  
// ██║██╔████╔██║███████║██║░░██╗░█████╗░░█████╗██║░░██╗░█████╗░░██╔██╗██║  
// ██║██║╚██╔╝██║██╔══██║██║░░╚██╗██╔══╝░░╚════╝██║░░╚██╗██╔══╝░░██║╚████║  
// ██║██║░╚═╝░██║██║░░██║╚██████╔╝███████╗░░░░░░╚██████╔╝███████╗██║░╚███║  
// ╚═╝╚═╝░░░░░╚═╝╚═╝░░╚═╝░╚═════╝░╚══════╝░░░░░░░╚═════╝░╚══════╝╚═╝░░╚══╝  

// ░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Image Generation Agent

import { ImageGeneratorRequest, ImageGeneratorOutput } from "../../interfaces";
import Replicate from "replicate";

export async function runImageGenAgent(request: ImageGeneratorRequest): Promise<ImageGeneratorOutput> {
    const { prompt, ak, go_fast, guidance, megapixels, num_outputs, aspect_ratio, output_format, output_quality, prompt_strength, num_inference_steps } = request;

    const replicate = new Replicate({
        auth: ak,
    });

    const input = {
        prompt: prompt,
        go_fast: go_fast ?? true,
        guidance: guidance ?? 3.5,
        megapixels: megapixels ?? "1",
        num_outputs: num_outputs ?? 1,
        aspect_ratio: aspect_ratio ?? "1:1",
        output_format: output_format ?? "webp",
        output_quality: output_quality ?? 80,
        prompt_strength: prompt_strength ?? 0.8,
        num_inference_steps: num_inference_steps ?? 28
    };
      
    const output = await replicate.run("black-forest-labs/flux-dev", { input });

    const imageUrl = (output as any).output[0];
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    return { image: Buffer.from(buffer) };
}