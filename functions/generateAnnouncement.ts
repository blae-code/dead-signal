import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { topic, context } = await req.json();

    const announcementPrompt = `Draft an engaging and professional clan announcement for: "${topic}"
Context: ${context}

Create something that captures attention, communicates clearly, and maintains the Dead Signal tactical atmosphere. Be concise but impactful.
Return JSON: { title: string, body: string, tone: "Emergency"|"Intel"|"Ops"|"General"|"Maintenance", suggested_actions: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: announcementPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          tone: { type: 'string' },
          suggested_actions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});