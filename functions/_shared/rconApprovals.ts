import { AppError } from "./backend.ts";

const APPROVAL_ENTITY = "RconCommandApproval";
const DEFAULT_APPROVAL_TTL_MINUTES = 15;

interface ApprovalRecord {
  id: string;
  command_hash: string;
  command_preview: string;
  target_id: string;
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  consumed_by?: string;
  consumed_at?: string;
  expires_at: string;
  status: "pending" | "approved" | "consumed" | "expired";
  reason?: string;
}

const memoryApprovals = new Map<string, ApprovalRecord>();

const textEncoder = new TextEncoder();

const entityClient = (base44: any): any | null => {
  const entities = base44?.asServiceRole?.entities;
  if (!entities) {
    return null;
  }
  return entities[APPROVAL_ENTITY] || null;
};

const nowIso = () => new Date().toISOString();

const isExpired = (expiresAt: string): boolean => {
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) ? ts <= Date.now() : true;
};

const toApprovalRecord = (raw: any): ApprovalRecord => ({
  id: String(raw.id),
  command_hash: String(raw.command_hash),
  command_preview: String(raw.command_preview || ""),
  target_id: String(raw.target_id || "default"),
  requested_by: String(raw.requested_by),
  requested_at: String(raw.requested_at || raw.created_date || nowIso()),
  approved_by: raw.approved_by ? String(raw.approved_by) : undefined,
  approved_at: raw.approved_at ? String(raw.approved_at) : undefined,
  consumed_by: raw.consumed_by ? String(raw.consumed_by) : undefined,
  consumed_at: raw.consumed_at ? String(raw.consumed_at) : undefined,
  expires_at: String(raw.expires_at),
  status: (raw.status || "pending") as ApprovalRecord["status"],
  reason: raw.reason ? String(raw.reason) : undefined,
});

const loadApproval = async (base44: any, approvalId: string): Promise<ApprovalRecord | null> => {
  const entity = entityClient(base44);
  if (entity) {
    try {
      const fromEntity = await entity.get(approvalId);
      if (fromEntity) {
        const normalized = toApprovalRecord(fromEntity);
        memoryApprovals.set(normalized.id, normalized);
        return normalized;
      }
    } catch {
      // Continue to memory fallback.
    }
  }
  return memoryApprovals.get(approvalId) ?? null;
};

const persistApprovalCreate = async (base44: any, record: ApprovalRecord): Promise<void> => {
  const entity = entityClient(base44);
  if (!entity) {
    return;
  }
  try {
    await entity.create(record);
  } catch {
    // Keep in-memory fallback only when entity is unavailable.
  }
};

const persistApprovalUpdate = async (
  base44: any,
  approvalId: string,
  patch: Record<string, unknown>,
): Promise<void> => {
  const entity = entityClient(base44);
  if (!entity) {
    return;
  }
  try {
    await entity.update(approvalId, patch);
  } catch {
    // Keep in-memory fallback only when entity is unavailable.
  }
};

export const hashCommand = async (command: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(command));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const createRconApprovalRequest = async (
  base44: any,
  actorUserId: string,
  command: string,
  targetId: string,
  reason?: string,
): Promise<ApprovalRecord> => {
  const ttlMinutesRaw = Deno.env.get("RCON_APPROVAL_TTL_MINUTES")?.trim();
  const ttlMinutes = ttlMinutesRaw ? Number(ttlMinutesRaw) : DEFAULT_APPROVAL_TTL_MINUTES;
  const ttlMs = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes * 60_000 : DEFAULT_APPROVAL_TTL_MINUTES * 60_000;
  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const record: ApprovalRecord = {
    id: crypto.randomUUID(),
    command_hash: await hashCommand(command),
    command_preview: command.slice(0, 120),
    target_id: targetId,
    requested_by: actorUserId,
    requested_at: requestedAt,
    expires_at: expiresAt,
    status: "pending",
    ...(reason ? { reason } : {}),
  };

  memoryApprovals.set(record.id, record);
  await persistApprovalCreate(base44, record);
  return record;
};

export const approveRconApprovalRequest = async (
  base44: any,
  actorUserId: string,
  approvalId: string,
): Promise<ApprovalRecord> => {
  const record = await loadApproval(base44, approvalId);
  if (!record) {
    throw new AppError(404, "approval_not_found", "Approval request was not found.");
  }
  if (record.requested_by === actorUserId) {
    throw new AppError(409, "approval_self_not_allowed", "A different admin must approve this command.");
  }
  if (record.status === "consumed") {
    throw new AppError(409, "approval_already_consumed", "Approval request has already been used.");
  }
  if (isExpired(record.expires_at)) {
    record.status = "expired";
    memoryApprovals.set(record.id, record);
    await persistApprovalUpdate(base44, record.id, { status: "expired" });
    throw new AppError(410, "approval_expired", "Approval request has expired.");
  }

  const patch: Partial<ApprovalRecord> = {
    status: "approved",
    approved_by: actorUserId,
    approved_at: nowIso(),
  };
  const updated: ApprovalRecord = {
    ...record,
    ...patch,
  };
  memoryApprovals.set(updated.id, updated);
  await persistApprovalUpdate(base44, updated.id, patch as Record<string, unknown>);
  return updated;
};

export const consumeRconApproval = async (
  base44: any,
  actorUserId: string,
  approvalId: string,
  command: string,
  targetId: string,
): Promise<ApprovalRecord> => {
  const record = await loadApproval(base44, approvalId);
  if (!record) {
    throw new AppError(404, "approval_not_found", "Approval request was not found.");
  }
  if (isExpired(record.expires_at)) {
    record.status = "expired";
    memoryApprovals.set(record.id, record);
    await persistApprovalUpdate(base44, record.id, { status: "expired" });
    throw new AppError(410, "approval_expired", "Approval request has expired.");
  }
  if (record.status !== "approved") {
    throw new AppError(409, "approval_not_approved", "Approval request is not approved.");
  }
  if (record.approved_by && record.approved_by === actorUserId) {
    throw new AppError(409, "approval_executor_conflict", "The approving admin cannot execute the same sensitive command.");
  }

  const commandHash = await hashCommand(command);
  if (record.command_hash !== commandHash || record.target_id !== targetId) {
    throw new AppError(409, "approval_mismatch", "Approval request does not match command or target.");
  }

  const patch: Partial<ApprovalRecord> = {
    status: "consumed",
    consumed_by: actorUserId,
    consumed_at: nowIso(),
  };
  const updated: ApprovalRecord = {
    ...record,
    ...patch,
  };
  memoryApprovals.set(updated.id, updated);
  await persistApprovalUpdate(base44, updated.id, patch as Record<string, unknown>);
  return updated;
};
