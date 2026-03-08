import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAdmin(await base44.auth.me());

    const body = await parseJsonBody<{
      context?: unknown;
      serverStatus?: unknown;
      recentEvents?: unknown;
    }>(req);
    const context = (body.context && typeof body.context === "object" ? body.context : body.serverStatus) || {};
    const recentEvents = Array.isArray(body.recentEvents) ? body.recentEvents : [];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a server admin assistant. Given this server status and recent events, suggest 5 useful RCON commands to improve the server.

Server Status: ${JSON.stringify(context)}

Recent Events: ${JSON.stringify(recentEvents)}

For each command, consider: performance optimization, player management, maintenance, memory management, and addressing recent issues.

Return a JSON object with a "commands" array. Each command should have: command (the RCON command string), and reason (brief explanation of why this command is useful now).`,
      response_json_schema: {
        type: "object",
        properties: {
          commands: {
            type: "array",
            items: {
              type: "object",
              properties: {
                command: { type: "string" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
    });

    return Response.json({
      success: true,
      commands: Array.isArray(result?.commands) ? result.commands : [],
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
