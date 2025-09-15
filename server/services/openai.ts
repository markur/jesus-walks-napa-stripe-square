import OpenAI from "openai";
import type { ModelConfig } from "@shared/schema";

let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("Warning: Missing OPENAI_API_KEY. OpenAI features will be disabled. Using alternative AI providers (Anthropic/Gemini) instead.");
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  modelConfig: ModelConfig
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY environment variable or use an alternative AI provider (Anthropic/Gemini).');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelConfig.modelId,
      messages,
      temperature: Number(modelConfig.temperature),
      max_tokens: modelConfig.maxTokens,
    });

    return completion.choices[0].message.content || '';
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

export async function countTokens(text: string): Promise<number> {
  // Approximate token count (1 token ≈ 4 chars in English)
  return Math.ceil(text.length / 4);
}
