import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.MINIMAX_API_KEY || '',
  baseURL: 'https://api.minimax.io/anthropic',
});

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function createClaudeMessage(messages: Message[], systemPrompt?: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'MiniMax-M2.7',
    max_tokens: 1024,
    system: systemPrompt,
    thinking: {
      type: "disabled",
    },
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  // Handle thinking block if it comes through
  if (content.type === 'thinking') {
    // Find the actual text response
    const textContent = response.content.find(c => c.type === 'text');
    return textContent?.type === 'text' ? textContent.text : 'I apologize, but I could not process that request.';
  }
  return 'I apologize, but I could not process that request.';
}

export async function createClaudeStream(messages: Message[], systemPrompt?: string) {
  const stream = await anthropic.messages.stream({
    model: 'MiniMax-M2.7',
    max_tokens: 1024,
    system: systemPrompt,
    thinking: {
      type: "disabled",
    },
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  return stream;
}
