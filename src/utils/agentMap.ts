// agentMap.ts
import { runInternetAgent } from "../agents/internet/agent";
import { runSequentialInternetAgent } from "../agents/sequentialInternet/agent";
import { runBrowserUseAgent } from "../agents/browseruse/agent";
import { runDocuchatAgent } from "../agents/docuchat/agent";
import { runPresentationGeneratorAgent } from "../agents/presentationgen/agent";
import { runPdfGenAgent } from "../agents/pdfgenerator/agent";
import { runImageGenAgent } from "../agents/imagegen/agent";
import { runVideoGenAgent } from "../agents/videogen/agent";
import { textToSpeech } from "../agents/texttospeech/agent";
import { runAskMemoryAgent } from "../agents/askmemory/agent";
import { addMemory } from "../agents/addmemory/agent";
import { runSequentialMemoryAgent } from "../agents/sequentialmemory/agent";
import { runQueryMemoryAgent } from "../agents/querymemory/agent";
import { clearMemoryAgent } from "../agents/clearmemory/agent";
import { runReadPageAgent } from "../agents/readpage/agent";
import { runWritePageAgent } from "../agents/writepage/agent";
import { runAddToPageAgent } from "../agents/addtopage/agent";
import { runGetNotebookAgent } from "../agents/getnotebook/agent";
import { runGetPageAgent } from "../agents/getnotebookpage/agent";
import { runDeleteNotebookAgent } from "../agents/deletenotebook/agent";
import { runDeleteNotebookPageAgent } from "../agents/deletenotebookpage/agent";
import { runYouTubeAgent } from "../agents/youtube/agent";
import { runReadWebpageAgent } from "../agents/readwebpage/agent";
import { runCodeAgent } from "../agents/code/agent";

// The map from agent name to the agent function
export const agentMap: Record<string, (params: any) => Promise<any>> = {
    runInternetAgent,
    runSequentialInternetAgent,
    runBrowserUseAgent,
    runDocuchatAgent,
    runPresentationGeneratorAgent,
    runPdfGenAgent,
    runImageGenAgent,
    runVideoGenAgent,
    textToSpeech,
    runAskMemoryAgent,
    addMemory,
    runSequentialMemoryAgent,
    runQueryMemoryAgent,
    clearMemoryAgent,
    runReadPageAgent,
    runWritePageAgent,
    runAddToPageAgent,
    runGetNotebookAgent,
    runGetPageAgent,
    runDeleteNotebookAgent,
    runDeleteNotebookPageAgent,
    runYouTubeAgent,
    runReadWebpageAgent,
    runCodeAgent,
};
