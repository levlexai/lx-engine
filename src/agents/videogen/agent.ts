// ██╗░░░██╗██╗██████╗░███████╗░█████╗░░░░░░░░██████╗░███████╗███╗░░██╗
// ██║░░░██║██║██╔══██╗██╔════╝██╔══██╗░░░░░░██╔════╝░██╔════╝████╗░██║
// ╚██╗░██╔╝██║██║░░██║█████╗░░██║░░██║█████╗██║░░██╗░█████╗░░██╔██╗██║
// ░╚████╔╝░██║██║░░██║██╔══╝░░██║░░██║╚════╝██║░░╚██╗██╔══╝░░██║╚████║
// ░░╚██╔╝░░██║██████╔╝███████╗╚█████╔╝░░░░░░╚██████╔╝███████╗██║░╚███║
// ░░░╚═╝░░░╚═╝╚═════╝░╚══════╝░╚════╝░░░░░░░░╚═════╝░╚══════╝╚═╝░░╚══╝

// ░█████╗░░██████╗░███████╗███╗░░██╗████████╗
// ██╔══██╗██╔════╝░██╔════╝████╗░██║╚══██╔══╝
// ███████║██║░░██╗░█████╗░░██╔██╗██║░░░██║░░░
// ██╔══██║██║░░╚██╗██╔══╝░░██║╚████║░░░██║░░░
// ██║░░██║╚██████╔╝███████╗██║░╚███║░░░██║░░░
// ╚═╝░░╚═╝░╚═════╝░╚══════╝╚═╝░░╚══╝░░░╚═╝░░░
// Videogen Agent - Generate 6 second videos

import { VideoGeneratorRequest, VideoGeneratorOutput } from "../../interfaces";
import Replicate from "replicate";

export async function runVideoGenAgent(request: VideoGeneratorRequest): Promise<VideoGeneratorOutput> {
    
    const { prompt, ak } = request;

    const replicate = new Replicate({
        auth: ak,
    });

    const input = {
        prompt: prompt,
        prompt_optimizer: true
    };
      
    const output = await replicate.run("minimax/video-01", { input });

    // output.output[0] is the video URL
    const videoUrl = (output as any).output[0];
    const response = await fetch(videoUrl);
    const buffer = await response.arrayBuffer();

    return { video: Buffer.from(buffer) };  

}