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
    const user = requireAuthenticated(await base44.auth.me()) as { id?: string; email?: string };
    const actorId = user.id || user.email || 'unknown-user';
    enforceRateLimit(`llm:generateIntelSummary:${actorId}`, 12, 60_000, 'llm_rate_limited');

    const body = await parseJsonBody<{ summary_type?: unknown }>(req);
    const summaryType = typeof body.summary_type === 'string' && body.summary_type.trim()
      ? body.summary_type.trim()
      : 'server_events';
    if (summaryType !== 'server_events' && summaryType !== 'clan_activity') {
      throw new AppError(400, 'invalid_summary_type', 'summary_type must be server_events or clan_activity.');
    }

    let sourceData = [];
    if (summaryType === 'server_events') {
      sourceData = await base44.entities.ServerEvent.list('-created_date', 20);
    } else if (summaryType === 'clan_activity') {
      sourceData = await base44.entities.ActivityLog.list('-timestamp', 20);
    }

    const prompt = `Summarize the following ${summaryType} data concisely and professionally. Focus on key insights and actionable intelligence:\n\n${JSON.stringify(sourceData, null, 2)}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    const summary = await base44.entities.IntelSummary.create({
      summary_type: summaryType,
      title: `${summaryType.toUpperCase()} Summary - ${new Date().toLocaleDateString()}`,
      content: response,
      source_entity: summaryType === 'server_events' ? 'ServerEvent' : 'ActivityLog',
      generated_at: new Date().toISOString()
    });

    return Response.json({ success: true, summary });
  } catch (error) {
    return errorResponse(error);
  }
});
