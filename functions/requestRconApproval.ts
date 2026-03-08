import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  evaluateRconCommandPolicy,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';
import { createRconApprovalRequest } from './_shared/rconApprovals.ts';

const MAX_COMMAND_LENGTH = 256;

const sanitizeCommand = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new AppError(400, 'invalid_command', 'command must be a string.');
  }
  const command = value.trim();
  if (!command) {
    throw new AppError(400, 'invalid_command', 'command cannot be empty.');
  }
  if (command.length > MAX_COMMAND_LENGTH) {
    throw new AppError(400, 'invalid_command', `command exceeds ${MAX_COMMAND_LENGTH} characters.`);
  }
  if (/[\r\n]/.test(command)) {
    throw new AppError(400, 'invalid_command', 'command cannot include newline characters.');
  }
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(command)) {
    throw new AppError(400, 'invalid_command', 'command contains disallowed control characters.');
  }
  return command;
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{
      command?: unknown;
      target_id?: unknown;
      reason?: unknown;
    }>(req);
    const actorId = user?.id || user?.email || 'unknown-admin';
    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const command = sanitizeCommand(body.command);
    const policy = evaluateRconCommandPolicy(command);
    if (policy.blocked) {
      throw new AppError(400, 'command_blocked_by_policy', policy.reason || 'Command is blocked by policy.');
    }

    const requireApproval = (Deno.env.get('RCON_REQUIRE_APPROVAL_FOR_SENSITIVE') || 'true').toLowerCase() !== 'false';
    if (!policy.sensitive || !requireApproval) {
      return Response.json({
        success: true,
        approval_required: false,
        message: 'Approval not required for this command under current policy.',
        target_id: targetId,
      });
    }

    const reason = typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim().slice(0, 240)
      : undefined;
    const approval = await createRconApprovalRequest(base44, actorId, command, targetId, reason);

    return Response.json({
      success: true,
      approval_required: true,
      approval,
      target_id: targetId,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
