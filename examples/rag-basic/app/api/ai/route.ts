import { createClient, openaiAdapter } from '@actionpackd/ignite-ai-sdk';
import { embed } from '../../../lib/embed';
import { VectorStore } from '../../../lib/recall';
import { ragPrompt } from '../../../lib/prompts';

export const runtime = 'edge';

// Initialize vector store with some sample documents
const store = new VectorStore();
store.addDocuments([
  {
    id: '1',
    content: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    id: '2',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
]);

// Initialize AI client only if API key is available
let ai: ReturnType<typeof createClient> | null = null;

if (process.env.OPENAI_API_KEY) {
  ai = createClient({
    adapter: openaiAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
    }),
  });
}

export async function POST(req: Request) {
  const { query } = await req.json() as { query: string };

  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || !ai) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
        }),
        { status: 400 }
      );
    }
    
    // Retrieve relevant documents
    const context = await store.search(query);
    
    // Get streaming response
    const stream = await ai.stream(ragPrompt, { query, context });

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
