import { StringValidation } from "zod";

export interface InternetAgentRequest{
    prompt: string;
    n_queries?: number; // default three
    service?: InternetService;
    model: Model;
}

export interface Model{
    name: string;
    base_url: string;
    ak: string;
}

export interface InternetService{
    name: 'tavily' | 'jina' | 'brave' | 'exa';
    ak: string;
}

export interface SequentialInternetAgentRequest{
    prompt: string;
    n_queries?: number; // default three
    max_recursion?: number; // default 10
    service?: InternetService;
    model: Model;
}

export interface BrowserAgentRequest{
    prompt: string;
    model: Model;
    maxSteps?: number;
}

export interface BrowserAgentOutput{
    actions: BrowserAgentActions[];
    conclusion: string;
}

export interface BrowserAgentActions{
    action: string;
    screenshot: any; // choose an appropriate format for the screenshot image
}

export interface DocuchatRequest {
    prompt: string;
    document: Buffer; // should contain PDF file data
    model: Model;
}  

export interface PresentationGeneratorRequest {
    prompt: string;
    model: Model;
}

export interface PresentationGeneratorOutput {
    presentation: Buffer;
}

export interface PdfGeneratorRequest {
    prompt: string;
    model: Model;
}

export interface PdfGeneratorOutput {
    pdf: Buffer;
}

export interface ImageGeneratorRequest{
    prompt: string;
    ak: string; // replicate API key
    go_fast?: boolean; // default true
    guidance?: number; // default 3.5
    megapixels?: string; // default "1"
    num_outputs?: number; // default 1
    aspect_ratio?: string; // default "1:1"
    output_format?: string; // default "webp"
    output_quality?: number; // default 80
    prompt_strength?: number; // default 0.8
    num_inference_steps?: number; // default 28
}

export interface ImageGeneratorOutput{
    image: Buffer;
}

export interface VideoGeneratorRequest{
    prompt: string;
    ak: string; // replicate API key
}

export interface VideoGeneratorOutput{
    video: Buffer;
}

export interface TextToSpeechRequest{
    prompt: string;
    ak: string; // replicate API key
    speed?: number; // default 1.0
    voice?: string; // defaults to af_bella
}

export interface TextToSpeechOutput{
    audio: Buffer;
}

export interface AddMemoryRequest{
    memory: string;
    brainID: string;
}

export interface AskMemoryAgentRequest{
    prompt: string;
    n_queries?: number; // default three
    model: Model;
    brainID: string;
}

export interface SequentialMemoryAgentRequest {
    prompt: string;
    n_queries?: number; // default 3
    max_recursion?: number; // default 10
    brainID: string;
    model: Model;
}

export interface QueryMemoryRequest{
    query: string;
    brainID: string;
    n_results?: number; // defaults to 5
}

export interface QueryMemoryResponse{
   memories: QueryMemoryResult[]; 
}

export interface QueryMemoryResult{
    memory: string;
    distance: number;
}

export interface DeleteMemoryRequest{
    brainID: string;
}

export interface NotebookPage{
    id: string;
    title: string;
    content: string[];
}

export interface Notebook{
    id: string;
    title: string;
    pages: NotebookPage[];
}

export interface ReadPageAgentRequest{
    prompt: string;
    model: Model;
    notebookID: string;
    pageID: string;
}

export interface WritePageAgentRequest{
    prompt: string;
    model: Model;
    notebookID: string;
}

export interface WritePageAgentResponse{
    pageID: string;
    notebookID: string;
    page: NotebookPage;
}

export interface AddToPageAgentRequest{
    prompt: string;
    model: Model;
    notebookID: string;
    pageID: string;
}

export interface AddToPageAgentResponse{
    pageID: string;
    notebookID: string;
    page: NotebookPage;
}

export interface EditPageAgentRequest{
    prompt: string;
    model: Model;
    notebookID: string;
    pageID: string;
}

export interface GetNotebookRequest{
    notebookID: string;
}

export interface GetNotebookResponse{
    notebook: Notebook;
}

export interface GetPageRequest{
    notebookID: string;
    pageID: string;
}

export interface GetPageResponse{
    page: NotebookPage;
}

export interface DeleteNotebookPageRequest{
    notebookID: string;
    pageID: string;
}

export interface DeleteNotebookRequest{
    notebookID: string;
}

export interface ReadWebpageAgentRequest{
    url: string;
    model: Model;
    prompt: string;
}

export interface YoutubeAgentRequest{
    prompt: string;
    model: Model;
}

export interface CodeAgentRequest{
    prompt: string;
    model: Model;
    max_recursion?: number; // defaults to 10
    language?: 'python' | 'javascript'; //defaults to javascript
}

export interface CodeAgentResponse{
    conclusion: string;
    rancode: RanCode[];
}

export interface RanCode{
    code: string;
    output: string;
}

/**
 * Each agent call in the pipeline has:
 *  - agent: the name of the agent to run (must match your agentMap keys)
 *  - params: the request object needed by that agent
 */
export interface AgentPipelineCall {
    agent: string;
    params: any; // The agent-specific params
  }
  
/**
 * A row in the pipeline is an array of agent calls to run in parallel
 */
export type AgentPipelineRow = AgentPipelineCall[];
  
/**
 * The overall request body for /agent
 */
export interface AgentRouteBody {
    defaultModel: Model;
    returnLastOnly?: boolean; // defaults to false
    pipeline: AgentPipelineRow[]; 
}