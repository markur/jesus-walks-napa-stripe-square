
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ModelConfig } from "@shared/schema";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing required env var: GOOGLE_API_KEY");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateGeminiResponse(
  messages: ChatMessage[],
  modelConfig: ModelConfig
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: modelConfig.modelId,
      generationConfig: {
        temperature: Number(modelConfig.temperature),
        maxOutputTokens: modelConfig.maxTokens,
      },
    });

    // Convert messages to Gemini format
    const chat = model.startChat({
      history: messages
        .filter(msg => msg.role !== 'system')
        .slice(0, -1) // Remove the last message as it will be sent separately
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
    });

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    
    return result.response.text();
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(`Failed to generate Gemini response: ${error.message}`);
  }
}

export async function countGeminiTokens(text: string): Promise<number> {
  // Approximate token count (1 token ≈ 4 chars for Gemini)
  return Math.ceil(text.length / 4);
}
