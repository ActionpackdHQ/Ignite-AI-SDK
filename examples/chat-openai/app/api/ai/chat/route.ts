import { createClient, openaiAdapter, definePrompt, type StreamChunk } from '@actionpackd/ignite-ai-sdk';
import { z } from 'zod';
import type { Message } from '../../../../lib/types';

export const runtime = 'edge';

const chatPrompt = definePrompt({
  input: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })),
  }),
  output: z.object({
    reply: z.string(),
  }),
  template: ({ messages }: { messages: Array<{ role: 'user' | 'assistant'; content: string }> }) => {
    return messages
      .map(({ role, content }) => `${role}: ${content}`)
      .join('\n') + '\nassistant:';
  },
});

// Initialize AI client only if API key is available
let ai: ReturnType<typeof createClient> | null = null;

if (process.env.OPENAI_API_KEY) {
  ai = createClient({
    adapter: openaiAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
    }),
    onToken: (token: string) => {
      console.log('[Token]', token);
    },
    onFinish: (result: string) => {
      console.log('[Done]', result);
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: Message[] };

  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || !ai) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          } 
        }
      );
    }
    const stream = await ai.stream(chatPrompt, { messages });

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.text) {
                controller.enqueue(
                  `data: ${JSON.stringify(chunk)}\n\n`
                );
              }
              if (chunk.done) {
                controller.close();
              }
            }
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    );
  }
}
