import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';
import { approveRconApprovalRequest } from './_shared/rconApprovals.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{ approval_id?: unknown }>(req);
    if (typeof body.approval_id !== 'string' || !body.approval_id.trim()) {
      throw new AppError(400, 'invalid_approval_id', 'approval_id must be a non-empty string.');
    }

    const actorId = user?.id || user?.email || 'unknown-admin';
    const approval = await approveRconApprovalRequest(base44, actorId, body.approval_id.trim());

    return Response.json({
      success: true,
      approval,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
