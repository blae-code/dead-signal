import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  enforceRateLimit,
  errorResponse,
  parseJsonBody,
  requireAuthenticated,
  requireMethod,
} from './_shared/backend.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me());
    const actorId = (user as any)?.id || (user as any)?.email || 'unknown-user';
    enforceRateLimit(`llm:gameKnowledgeBot:${actorId}`, 20, 60_000, 'llm_rate_limited');

    const body = await parseJsonBody<{ question?: unknown }>(req);
    if (typeof body.question !== 'string' || !body.question.trim()) {
      throw new AppError(400, 'invalid_question', 'question must be a non-empty string.');
    }
    const question = body.question.trim().slice(0, 1_500);

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

    return Response.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
