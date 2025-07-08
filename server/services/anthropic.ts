
import Anthropic from "@anthropic-ai/sdk";
import type { ModelConfig } from "@shared/schema";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing required env var: ANTHROPIC_API_KEY");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateClaudeResponse(
  messages: ChatMessage[],
  modelConfig: ModelConfig
): Promise<string> {
  try {
    // Convert messages format for Anthropic
    const anthropicMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

    // Extract system message if exists
    const systemMessage = messages.find(msg => msg.role === 'system')?.content;

    const response = await anthropic.messages.create({
      model: modelConfig.modelId,
      max_tokens: modelConfig.maxTokens,
      temperature: Number(modelConfig.temperature),
      system: systemMessage,
      messages: anthropicMessages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error: any) {
    console.error('Anthropic API Error:', error);
    throw new Error(`Failed to generate Claude response: ${error.message}`);
  }
}

export async function countClaudeTokens(text: string): Promise<number> {
  // Approximate token count (1 token ≈ 3.5 chars for Claude)
  return Math.ceil(text.length / 3.5);
}
