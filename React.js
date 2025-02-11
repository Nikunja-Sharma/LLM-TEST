import OpenAI from "openai"
import { ChatOpenAI } from "@langchain/openai"
import { LLMChain } from "langchain/chains"
import { PromptTemplate } from "@langchain/core/prompts"
import dotenv from "dotenv"
dotenv.config() 

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", // Optional. Site title for rankings on openrouter.ai.
  }
})

// Create multiple ChatOpenAI instances all using Gemini
const models = {
  master: new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "<YOUR_SITE_URL>",
        "X-Title": "<YOUR_SITE_NAME>",
      }
    },
    modelName: "google/gemini-2.0-flash-thinking-exp-1219:free",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
  }),
  alpha: new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "<YOUR_SITE_URL>",
        "X-Title": "<YOUR_SITE_NAME>",
      }
    },
    verbose: true,
    modelName: "google/gemini-2.0-flash-thinking-exp-1219:free",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
  }),
  beta: new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "<YOUR_SITE_URL>",
        "X-Title": "<YOUR_SITE_NAME>",
      }
    },
    verbose: true,
    modelName: "google/gemini-2.0-flash-thinking-exp-1219:free",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
  }),
  gamma: new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "<YOUR_SITE_URL>",
        "X-Title": "<YOUR_SITE_NAME>",
      }
    },
    verbose: true,
    modelName: "google/gemini-2.0-flash-thinking-exp-1219:free",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
  }),
  delta: new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "<YOUR_SITE_URL>",
        "X-Title": "<YOUR_SITE_NAME>",
      }
    },
    verbose: true,
    modelName: "google/gemini-2.0-flash-thinking-exp-1219:free",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
  }),
  omega: new ChatOpenAI({
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "<YOUR_SITE_URL>",
        "X-Title": "<YOUR_SITE_NAME>",
      }
    },
    verbose: true,
    modelName: "google/gemini-2.0-flash-thinking-exp-1219:free",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
  }),
}

// Create different prompts for each model
const prompts = {
  master: PromptTemplate.fromTemplate(
    `You are the Master Model. Your role is to:
    1. Introduce yourself as the Master Controller
    2. Analyze the topic: {topic}
    3. Delegate specific tasks to the worker models
    4. Wait for their responses
    5. Provide final synthesis of all outputs
    
    Current task: {topic}
    Worker outputs: {workerOutputs}`
  ),
  alpha: PromptTemplate.fromTemplate(
    "I am Alpha Model, specialized in creative thinking. For the topic: {topic}, I will provide innovative ideas and creative solutions."
  ),
  beta: PromptTemplate.fromTemplate(
    "I am Beta Model, specialized in analytical thinking. For the topic: {topic}, I will provide detailed analysis and logical breakdown."
  ),
  gamma: PromptTemplate.fromTemplate(
    "I am Gamma Model, specialized in practical applications. For the topic: {topic}, I will provide real-world implementation strategies."
  ),
  delta: PromptTemplate.fromTemplate(
    "I am Delta Model, specialized in critical evaluation. For the topic: {topic}, I will provide pros, cons, and potential challenges."
  ),
  omega: PromptTemplate.fromTemplate(
    "I am Omega Model, the synthesizer. My task is to analyze and combine all previous outputs: {allOutputs} and provide the most comprehensive solution for: {topic}"
  ),
}

// Create chains for each model
const chains = Object.keys(models).reduce((acc, modelName) => {
  acc[modelName] = new LLMChain({
    llm: models[modelName],
    prompt: prompts[modelName]
  })
  return acc
}, {})

async function main() {
  const topic = "Create complete roadmap for C++ developer"
  const outputs = {}
  
  // First, get the master's initial instruction
  console.log("\n=== MASTER MODEL INITIAL INSTRUCTION ===")
  const masterResult = await chains.master.invoke({ 
    topic,
    workerOutputs: "Awaiting worker model outputs..." 
  })
  console.log(masterResult.text)

  // Then, run worker models in parallel
  const workerModels = ['alpha', 'beta', 'gamma', 'delta']
  for (const modelName of workerModels) {
    console.log(`\n=== ${modelName.toUpperCase()} MODEL OUTPUT ===`)
    console.log(topic)
    try {
      const result = await chains[modelName].invoke({ topic })
      outputs[modelName] = result
      console.log(result)
    } catch (error) {
      console.error(`Error with ${modelName}:`, error.message)
    }
  }

  // Finally, let omega model synthesize all outputs
  console.log("\n=== OMEGA MODEL SYNTHESIS ===")
  const omegaResult = await chains.omega.invoke({ 
    topic,
    allOutputs: JSON.stringify(outputs)
  })
  console.log(omegaResult.text)

  // Let master model provide final thoughts
  console.log("\n=== MASTER MODEL FINAL SYNTHESIS ===")
  const masterFinal = await chains.master.invoke({ 
    topic,
    workerOutputs: JSON.stringify({...outputs, omega: omegaResult.text})
  })
  console.log(masterFinal.text)
}

main()