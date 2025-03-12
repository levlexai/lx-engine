# Levlex Agent Engine (LX Engine)

**The Levlex Agent Engine (LX Engine)** is an **API-based execution engine** that lets you run multiple **AI “agents”** (or modules) either in a **flexible pipeline** or by **calling each agent individually**. Unlike many AI frameworks that require hand-coded flows for each agent, LX Engine streamlines the process by letting you **define your entire workflow** as a single input object. The engine orchestrates all steps automatically and can return **step-by-step** results or just the **final output**. You can also invoke any of the **20+ built-in agents** at **their own dedicated endpoints**, covering a wide range of use cases from **web retrieval** and **local vector memory** to **PDF generation**, **browser automation**, **presentation creation**, and more. This system is a **work in progress**, and we welcome your feedback to make it even better.

This repository is a **work in progress**—we appreciate your feedback!

Learn more about Levlex and our work at our [website](https://levlex.xyz/).

Note about commit history: most of the development was done at [this repo](https://github.com/levlexai/levlex-engine), but then the project scaffolding was redone and finalized here. So this is the correct repo.

---

## Table of Contents
- [Levlex Agent Engine (LX Engine)](#levlex-agent-engine-lx-engine)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Why LX Engine?](#why-lx-engine)
  - [Key Features](#key-features)
  - [Installation \& Setup](#installation--setup)
  - [Usage](#usage)
    - [1. Using the `/agent` Endpoint for Workflows](#1-using-the-agent-endpoint-for-workflows)
    - [2. Calling Individual Agents via `/agent/{AgentName}`](#2-calling-individual-agents-via-agentagentname)
  - [Built-In Agents](#built-in-agents)
    - [1. Internet Agents](#1-internet-agents)
    - [2. Memory Agents](#2-memory-agents)
    - [3. Notebook Agents](#3-notebook-agents)
    - [4. Document Agents](#4-document-agents)
    - [5. Code Agents](#5-code-agents)
    - [6. Multimedia Agents (Images/Audio/Video)](#6-multimedia-agents-imagesaudiovideo)
    - [7. Other Utility Agents](#7-other-utility-agents)
  - [How It Works](#how-it-works)
  - [Project Structure](#project-structure)
  - [Dependencies](#dependencies)
  - [Roadmap](#roadmap)
    - [Feedback \& Contributions](#feedback--contributions)

---

## Overview
**Levlex Agent Engine** aims to streamline the process of creating and orchestrating AI-based “agents.” Each agent can perform a specific task—like searching the web, reading or writing from local “brains” (vector databases), generating text or images, or controlling a browser. The interfaces can be found in src/interfaces.ts

### Why LX Engine?
- **Unified Agent Framework**: Instead of restricting your application ot the specific hard-coded agents in your project, you define them as a pipeline in JSON, which is then executed as an API request, so that the same server can run multiple workflows. 
- **Flexibility**: Because each agent is an independent function, you can add new agents or replace existing ones.
- **Scalable**: A single engine can handle multiple pipelines or calls in parallel.
- **Local Vector DB**: Manages local embeddings using **LanceDB** + **fastembed** for memory storage and retrieval.

---

## Key Features
1. **Pipeline Execution** via a single `/agent` endpoint. You provide a list of agent calls, each with its parameters, and LX Engine executes them in sequence (or in parallel per “row”).
2. **Individual Agent Endpoints**: Each agent is also exposed at `/agent/{agentName}`, allowing direct calls.
3. **20+ Built-in Agents** covering a wide range of tasks:
   - **Internet**: Searching the web, retrieving content, summarizing results.
   - **Memory**: Reading from or writing to local vector-based memory stores (LanceDB).
   - **Notebook**: CRUD operations on “notebook” structures (like JSON-based text blocks).
   - **Document Processing**: Generating PDFs, PPTX presentations, or reading PDF documents.
   - **Multimedia**: Generating images (via Replicate), text-to-speech, basic video generation.
   - **Code Execution**: Running JavaScript or Python code in a sandbox.
4. **Recursive Agents**: Agents like *Sequential Internet Agent* or *Sequential Memory Agent* can decide if more queries or memory lookups are needed, automatically repeating until satisfied.
5. **Context & Orchestration**: The pipeline can pass context from one agent’s result to the next.

---

## Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/levlex-agent-engine.git
   cd levlex-agent-engine
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **API Keys** 
   - You specify the API key you want in the main request, along with the model string and service base URl for the desired LLM you want.
   - This provides many options as cloud services like openrouter provide a lot of models through one API, and localLlama folks can use ollama, vLLM, etc as their LLM provider.
   - You can also apply specific models to specific agents in your pipelines. You can refer to interfaces.ts to see the inputs for these agents, but most agents accept a Model parameter. If no specific model is provided, the default in the API request is used.
   - By default LX Engine uses duckduckscrape for search, but Tavily, Exa, Brave, and Jina are also supported.
   - For image and video generation, replicate is used.
4. **Start the Server**:
   ```bash
   npm run dev
   ```
   Or:
   ```bash
   npm run start
   ```
   The server should run on [http://localhost:3000](http://localhost:3000) by default (depending on your config).

---

## Usage

### 1. Using the `/agent` Endpoint for Workflows

**Endpoint**: `POST /agent`

**Body**: An example `AgentRouteBody` object might look like:

```json
{
  "defaultModel": {
    "name": "gpt-3.5-turbo",
    "ak": "YOUR_OPENAI_API_KEY",
    "baseUrl": "https://api.openai.com/v1"
  },
  "returnLastOnly": false,
  "pipeline": [
    [
      {
        "agent": "runInternetAgent",
        "params": {
          "prompt": "What is the capital of France?"
        }
      }
    ],
    [
      {
        "agent": "runAskMemoryAgent",
        "params": {
          "brainID": "test-brain",
          "prompt": "Recall historical details about France"
        }
      }
    ]
  ]
}
```

**Explanation**:
- `pipeline` is an array of **rows**. Each row is executed in parallel (agents in the same row run at the same time).
- The next row waits until the previous row completes.  
- `returnLastOnly: false` means you get the entire pipeline’s results. If you set `true`, you only get the final row’s output.

**Response**: You’ll receive an array of arrays (or just the last row) with each agent’s results.

### 2. Calling Individual Agents via `/agent/{AgentName}`

Where `AgenName` is as defined in `/utils/agentMap.ts`.

You can also directly call each agent:

- **POST** `/agent/runInternetAgent`
- **POST** `/agent/runQueryMemoryAgent`
- **POST** `/agent/runPdfGenAgent`
- **POST** `/agent/runCodeAgent`
- etc.

**Body**: Depends on the agent in question. For example, calling the `runInternetAgent` might require:
```json
{
  "prompt": "Tell me about the Eiffel Tower",
  "n_queries": 3,
  "service": {
    "name": "brave",
    "ak": "YOUR_BRAVE_API_KEY"
  },
  "model": {
    "name": "gpt-3.5-turbo",
    "ak": "YOUR_OPENAI_API_KEY"
  }
}
```

**Response**: Typically returns the agent’s output, e.g. a string or a data object.

---

## Built-In Agents

Below is a brief overview of the built-in agents. See the code for in-depth parameter details.

### 1. Internet Agents
- **`runInternetAgent`**  
  Searches the web (via Brave, Tavily, Exa, Jina, or DuckDuckGo) and uses an LLM to summarize or answer a prompt.  
  *Params*:
  ```ts
  interface InternetAgentRequest {
    prompt: string;
    n_queries?: number;
    service?: {
      name: string;  // "brave" | "tavily" | "exa" | "jina" | ...
      ak?: string;   // API key
    };
    model: Model;    // e.g. { name: "gpt-3.5-turbo", ak: "..." }
  }
  ```
- **`runSequentialInternetAgent`**  
  Similar to `runInternetAgent`, but can decide whether to refine its search multiple times (up to a `max_recursion`). Each iteration re-prompts the LLM to see if more searching is required.

### 2. Memory Agents
Designed to interact with a local vector DB powered by **LanceDB** + **fastembed**. A “brain” is simply a named vector database.

- **`addMemory`**  
  Splits text into ~300-word chunks, embeds each chunk, and stores them in a LanceDB table named after `brainID`.
- **`runAskMemoryAgent`**  
  Given a user prompt, the agent generates multiple queries to search memory, retrieves relevant chunks, and forms a final answer citing them.
- **`runSequentialMemoryAgent`**  
  Similar to the internet approach, but for your local memory. It can recursively query memory until it decides no more info is needed.
- **`runQueryMemoryAgent`**  
  A direct vector similarity search: embed a query and get top results from a `brainID`.
- **`clearMemoryAgent`**  
  Clears data from a memory “brain”.

### 3. Notebook Agents
A “notebook” is a JSON structure representing text blocks (like a simple text-based workspace). You can:
- **`runReadPageAgent`**
- **`runWritePageAgent`**
- **`runAddToPageAgent`**
- **`runGetNotebookAgent`**
- **`runGetPageAgent`**
- **`runDeleteNotebookAgent`**
- **`runDeleteNotebookPageAgent`**

They allow simple CRUD operations for storing and retrieving textual data. The format is up to you, but each “notebook” can be saved and read using these endpoints.

### 4. Document Agents
- **`runDocuchatAgent`**:  
  Takes a PDF (as a buffer), extracts its text, then uses an LLM to answer a prompt based on that text.
- **`runPdfGenAgent`**:  
  Dynamically generates a PDF with headings, paragraphs, and optional multi-column layout. Uses PDFKit.
- **`runPresentationGeneratorAgent`**:  
  Creates a PPTX file using **pptxgenjs**, generating slides, text, and optional charts.

### 5. Code Agents
- **`runCodeAgent`**:  
  A sequential agent that runs code and observes the output to generate a conclusion. Lets the LLM propose either a snippet of code to run (JavaScript or Python) or finalize with a conclusion. The code is sandboxed. This can be repeated multiple times until the LLM calls `finish`.

### 6. Multimedia Agents (Images/Audio/Video)
- **`runImageGenAgent`**:  
  Uses Replicate’s `black-forest-labs/flux-dev` model to generate an image based on a textual prompt.
- **`textToSpeech`**:  
  Converts a string prompt to speech (depends on your TTS configuration).
- **`runVideoGenAgent`**:  
  – Generates 6-second video clips using MiniMax OS video gen model via Replicate.
  
### 7. Other Utility Agents
- **`runBrowserUseAgent`**:  
  Controls a browser (using Playwright) via a step-by-step approach. The LLM is fed a screenshot and decides what to click, scroll, or type next. Ends with a conclusion about what was done.
- **`runReadWebpageAgent`**:  
  Reads and extracts text from an external webpage URL (or multiple URLs).
- **`runYouTubeAgent`**:  
  Processes a YouTube link (or discovered link) for transcripts or metadata.  
- **`runCodeAgent`**:  
  Already mentioned above, but includes JavaScript and Python code execution in a sandbox.

---

## How It Works

- **AgentMap**: The core file [`agentMap.ts`](./utils/agentMap.ts) maps agent names (like `"runInternetAgent"`) to the actual function that implements that agent.
- **`/agent`** route:  
  - Takes a JSON body describing a pipeline of steps.  
  - Each step references an agent name and parameters.  
  - The engine looks up the agent function and calls it with the provided parameters.  
  - Steps in the same row run in parallel; the next row waits until all parallel calls finish.  
  - The output is returned (either all steps’ results or just the last row’s results).
- **Individual Agent routes**:  
  - The code dynamically creates a route for each agent at `/agent/{agentName}`.  
  - You can call `POST /agent/runInternetAgent` or `POST /agent/runQueryMemoryAgent` directly, passing the required JSON body.

---

## Project Structure

A rough outline of the folder structure:

```
.
├─ agents/
│   ├─ internet/
│   │  └─ agent.ts         (# runInternetAgent, runSequentialInternetAgent)
│   ├─ memory/
│   │  └─ ...              (# askMemoryAgent, addMemory, queryMemory, etc.)
│   ├─ docuchat/
│   │  └─ agent.ts         (# runDocuchatAgent)
│   ├─ pdfgenerator/
│   │  └─ agent.ts         (# runPdfGenAgent)
│   ├─ presentationgen/
│   │  └─ agent.ts         (# runPresentationGeneratorAgent)
│   ├─ code/
│   │  └─ agent.ts         (# runCodeAgent)
│   ├─ ...
│
├─ utils/
│   ├─ agentMap.ts         (# Exports a record of all agent functions)
│   ├─ tableManager.ts     (# Manages LanceDB connections for memory)
│   ├─ internetQueries.ts  (# Functions for searching Brave, Tavily, Exa, etc.)
│   ├─ promptLlm.ts        (# Helper for prompting LLM with or without schema)
│   └─ ...
│
├─ routes/
│   ├─ agent.ts            (# The main /agent route + dynamic /agent/{agentName} endpoints)
│   └─ ...
│
├─ interfaces/
│   └─ index.ts            (# Type definitions for requests, agents, etc.)
├─ package.json
├─ README.md               (# This file)
└─ ...
```

---

## Dependencies

- **TypeScript** + **Zod**: For type-checking and runtime schema validation.
- **Express**: For the HTTP server and REST endpoints.
- **OpenAI-compatible LLM**: The engine is flexible—any OpenAI-compatible endpoint can be used. [OpenRouter](https://openrouter.ai/) is recommended for multiple model offerings.
- **fastembed** + **LanceDB**: Provides local vector embeddings and vector store for “memory” operations.
- **lowdb**: Simple local JSON-based key/value store for small data needs.
- **Playwright**: For the `BrowserUseAgent`, controlling a headless browser.
- **pdf-parse**: For reading PDFs (Docuchat).
- **pdfkit**: For generating PDFs (`runPdfGenAgent`).
- **pptxgenjs**: For generating PPTX presentations (`runPresentationGeneratorAgent`).
- **Replicate**: For the `runImageGenAgent`, using `black-forest-labs/flux-dev` or other image models.

---

## Roadmap

1. **OS Workflow GUI Builder**  
   A front-end interface to visually design and manage agent pipelines.
2. **Extensive Test Coverage**  
   Add automated tests for each agent.
3. **Examples**  
   Provide example scripts/cURL commands for each agent call.
4. **Additional Brain Creation Routes**  
   More robust endpoints to create and configure “brains” (vector DB instances).
5. **Additional Notebook Creation Routes**  
   Similarly for notebooks, to further simplify usage.
6. **Stricter Type Definitions**  
   Stronger schemas for agent request bodies to reduce runtime errors.
7. **Notebook-to-Editor Converters**  
   Tools to convert notebook JSON into common editor formats.
8. **Improved Logging & Monitoring**  
   So we can better trace pipeline steps and debug issues.
9. **Hosted Version**  
   Release the hosted LX Engine API.

---

### Feedback & Contributions
We’d love your input on how to make this engine better. Feel free to open issues, suggest features, or fork and submit pull requests.

Feel free to join/follow our socials: 
* [Website](https://levlex.xyz/)
* [Twitter/X](https://x.com/levlexai)
* [Discord](https://discord.gg/Xs47uquF)
* [Reddit](https://www.reddit.com/r/levlex/)

You can also [contact us](https://tally.so/r/wAWENk)

Enjoy building with the **Levlex Agent Engine**!