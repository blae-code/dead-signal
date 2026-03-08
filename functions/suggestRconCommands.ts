import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const context = body.context || body.serverStatus || {};
    const recentEvents = body.recentEvents || [];
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a server admin assistant. Given this server status and recent events, suggest 5 useful RCON commands to improve the server.

Server Status: ${JSON.stringify(context)}

Recent Events: ${JSON.stringify(recentEvents)}

For each command, consider: performance optimization, player management, maintenance, memory management, and addressing recent issues.

Return a JSON object with a "commands" array. Each command should have: command (the RCON command string), and reason (brief explanation of why this command is useful now).`,
      response_json_schema: {
        type: 'object',
        properties: {
          commands: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, commands: result.commands || [] });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to generate suggestions' }, { status: 500 });
  }
});