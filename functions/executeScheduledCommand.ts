import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{ scheduled_command_id?: unknown }>(req);
    if (typeof body.scheduled_command_id !== 'string' || !body.scheduled_command_id.trim()) {
      throw new AppError(400, 'invalid_scheduled_command_id', 'scheduled_command_id must be a non-empty string.');
    }
    const scheduledCommandId = body.scheduled_command_id.trim();

    const command = await base44.entities.ScheduledCommand.get(scheduledCommandId);
    if (!command) {
      throw new AppError(404, 'scheduled_command_not_found', 'Scheduled command not found.');
    }
    if (typeof command.command !== 'string' || !command.command.trim()) {
      throw new AppError(400, 'invalid_scheduled_command', 'Scheduled command has no executable command text.');
    }

    const invokePayload: Record<string, unknown> = {
      command: command.command.trim(),
      idempotency_key: `schedule:${scheduledCommandId}:${new Date().toISOString().slice(0, 16)}`,
    };
    if (typeof command.target_id === 'string' && command.target_id.trim()) {
      invokePayload.target_id = command.target_id.trim();
    }
    if (typeof command.approval_id === 'string' && command.approval_id.trim()) {
      invokePayload.approval_id = command.approval_id.trim();
    }

    const rconResponse = await base44.functions.invoke('sendRconCommand', {
      ...invokePayload
    });
    const rconData = rconResponse?.data;
    if (!rconData?.success) {
      throw new AppError(
        502,
        'rcon_execution_failed',
        typeof rconData?.message === 'string' && rconData.message
          ? rconData.message
          : typeof rconData?.error === 'string' && rconData.error
          ? rconData.error
          : 'Scheduled command failed to execute on the game server.',
      );
    }

    const updated = await base44.entities.ScheduledCommand.update(scheduledCommandId, {
      last_executed: new Date().toISOString(),
      next_execution: calculateNextExecution(command.schedule, command.execute_time)
    });

    return Response.json({ success: true, command: updated, rconResponse: rconData });
  } catch (error) {
    return errorResponse(error);
  }
});

function calculateNextExecution(schedule, executeTime) {
  if (typeof executeTime !== 'string' || !/^\d{2}:\d{2}$/.test(executeTime)) {
    throw new AppError(400, 'invalid_execute_time', 'execute_time must be in HH:MM format.');
  }
  const now = new Date();
  const [hours, minutes] = executeTime.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new AppError(400, 'invalid_execute_time', 'execute_time must contain valid hour/minute values.');
  }
  let next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (schedule === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (schedule === 'weekly') {
    if (next <= now) next.setDate(next.getDate() + 7);
  } else if (schedule === 'monthly') {
    if (next <= now) next.setMonth(next.getMonth() + 1);
  } else {
    throw new AppError(400, 'invalid_schedule', 'schedule must be one of: daily, weekly, monthly.');
  }

  return next.toISOString();
}
