import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { question } = await req.json();

    const botPrompt = `You are an expert Dead Signal game knowledge bot. Answer this player question comprehensively and in-character:
Question: "${question}"

Provide accurate game mechanics information, lore context, server rules, tips, and encourage the player. Be friendly and immersive.
Return JSON: { answer: string, tips: [string], related_topics: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: botPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          tips: { type: 'array', items: { type: 'string' } },
          related_topics: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});