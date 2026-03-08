import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
    AppError,
    enforceRateLimit,
    errorResponse,
    evaluateRconCommandPolicy,
    getDefaultPanelTargetId,
    getIdempotentReplay,
    parseJsonBody,
    readRequestIdempotencyKey,
    requireAdmin,
    requireMethod,
    sendPanelCommand,
    storeIdempotentReplay,
} from './_shared/backend.ts';
import { consumeRconApproval } from './_shared/rconApprovals.ts';

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
            idempotency_key?: unknown;
            approval_id?: unknown;
        }>(req);
        const actorId = user?.id || user?.email || 'unknown-admin';
        const targetId = typeof body.target_id === 'string' && body.target_id.trim()
            ? body.target_id.trim()
            : getDefaultPanelTargetId();

        const rateLimitPerMinuteRaw = Number(Deno.env.get('RCON_RATE_LIMIT_PER_MINUTE') || '30');
        const rateLimitPerMinute = Number.isFinite(rateLimitPerMinuteRaw) && rateLimitPerMinuteRaw > 0
            ? Math.floor(rateLimitPerMinuteRaw)
            : 30;
        enforceRateLimit(`rcon:${actorId}:${targetId}`, rateLimitPerMinute, 60_000, 'rcon_rate_limited');

        const command = sanitizeCommand(body.command);
        const idempotencyKey = readRequestIdempotencyKey(req, body.idempotency_key);
        if (idempotencyKey) {
            const replay = getIdempotentReplay(`sendRconCommand:${actorId}:${targetId}`, idempotencyKey);
            if (replay) {
                return Response.json(
                    {
                        ...(replay.payload as Record<string, unknown>),
                        idempotent_replay: true,
                    },
                    { status: replay.status },
                );
            }
        }

        const policy = evaluateRconCommandPolicy(command);
        if (policy.blocked) {
            throw new AppError(400, 'command_blocked_by_policy', policy.reason || 'Command is blocked by policy.');
        }

        const requireApproval = (Deno.env.get('RCON_REQUIRE_APPROVAL_FOR_SENSITIVE') || 'true').toLowerCase() !== 'false';
        let approval: Record<string, unknown> | null = null;
        if (policy.sensitive && requireApproval) {
            if (typeof body.approval_id !== 'string' || !body.approval_id.trim()) {
                throw new AppError(
                    412,
                    'approval_required',
                    'Sensitive commands require approval_id from requestRconApproval.',
                    { target_id: targetId },
                );
            }
            const consumed = await consumeRconApproval(
                base44,
                actorId,
                body.approval_id.trim(),
                command,
                targetId,
            );
            approval = {
                approval_id: consumed.id,
                approved_by: consumed.approved_by || null,
                approved_at: consumed.approved_at || null,
                consumed_at: consumed.consumed_at || null,
            };
        }

        await sendPanelCommand(command, targetId);
        const payload = {
            success: true,
            output: `Command sent: ${command}`,
            target_id: targetId,
            command_policy: {
                sensitive: policy.sensitive,
                blocked: policy.blocked,
            },
            approval,
        };
        if (idempotencyKey) {
            storeIdempotentReplay(`sendRconCommand:${actorId}:${targetId}`, idempotencyKey, payload, 200, 120_000);
        }
        return Response.json(payload);

    } catch (error) {
        return errorResponse(error);
    }
});
