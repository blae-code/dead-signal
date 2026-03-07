import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { context } = await req.json();
    const status = await base44.integrations.Core.InvokeLLM({
      prompt: `Given this server context: ${JSON.stringify(context)}, suggest 5 optimal RCON commands to improve performance, manage players, or address issues. Consider: CPU usage, player count, current issues.
Return JSON: { suggestions: [{command: string, reason: string, priority: "HIGH"|"MEDIUM"|"LOW"}] }`,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                reason: { type: 'string' },
                priority: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});