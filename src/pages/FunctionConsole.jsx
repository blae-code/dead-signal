import { useEffect, useMemo, useState } from "react";
import { Terminal, Shield, Radar, Activity, RadioTower, BrainCircuit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { T, PageHeader, Panel, ActionBtn, StatusBadge } from "@/components/ui/TerminalCard";
import LiveStatusStrip from "@/components/live/LiveStatusStrip";
import PermissionGate from "@/components/live/PermissionGate";
import ExecutionTimeline from "@/components/live/ExecutionTimeline";
import { useFunctionCapabilities } from "@/hooks/use-function-capabilities";
import { getFunctionPayloadTemplate } from "@/lib/function-payload-templates";

const SURFACE_ICONS = {
  ops_center: Terminal,
  telemetry_pipeline_lab: Activity,
  security_diagnostics: Shield,
  ai_intel_studio: BrainCircuit,
  field_ops: Radar,
};

const RISK_COLORS = {
  safe: T.green,
  elevated: T.amber,
  high: T.orange,
  critical: T.red,
};

const roleMessage = (capability) => {
  const requiredRole = capability?.required_role;
  if (requiredRole === "admin") {
    return "Admin role required. Action remains visible for audit and operational awareness.";
  }
  if (requiredRole === "tactical_writer") {
    return "Officer/lieutenant/commander or admin role required for tactical writes.";
  }
  return "Authentication required.";
};

const roleBadgeColor = (requiredRole) => {
  if (requiredRole === "admin") return T.red;
  if (requiredRole === "tactical_writer") return T.orange;
  return T.green;
};

const toLocalClock = () => new Date().toLocaleTimeString("en-US", { hour12: false });

const toTimelineDetail = (payload) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const toSchemaSummary = (schema) => {
  if (!schema || typeof schema !== "object") {
    return "{}";
  }
  try {
    return JSON.stringify(schema, null, 2);
  } catch {
    return "{}";
  }
};

export default function FunctionConsole() {
  const capabilitiesQuery = useFunctionCapabilities();
  const capabilities = capabilitiesQuery.capabilities;
  const groupedBySurface = capabilitiesQuery.groupedBySurface;

  const [selectedSurface, setSelectedSurface] = useState("ops_center");
  const [payloadByFunction, setPayloadByFunction] = useState({});
  const [runningByFunction, setRunningByFunction] = useState({});
  const [resultByFunction, setResultByFunction] = useState({});
  const [timeline, setTimeline] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      return;
    }
    setPayloadByFunction((prev) => {
      const next = { ...prev };
      capabilities.forEach((capability) => {
        if (next[capability.function_id]) {
          return;
        }
        const template = getFunctionPayloadTemplate(capability.function_id);
        next[capability.function_id] = JSON.stringify(template, null, 2);
      });
      return next;
    });
  }, [capabilities]);

  useEffect(() => {
    if (!groupedBySurface.some((group) => group.surface === selectedSurface) && groupedBySurface.length > 0) {
      setSelectedSurface(groupedBySurface[0].surface);
    }
  }, [groupedBySurface, selectedSurface]);

  const selectedGroup = useMemo(
    () => groupedBySurface.find((group) => group.surface === selectedSurface) || null,
    [groupedBySurface, selectedSurface],
  );

  const pushTimeline = (event) => {
    setTimeline((prev) => [event, ...prev].slice(0, 120));
  };

  const writeAuditEvent = async (event) => {
    const entity = base44?.entities?.FunctionExecutionAudit;
    if (!entity?.create) {
      return;
    }
    await entity.create(event).catch(() => null);
  };

  const setRunning = (functionId, running) => {
    setRunningByFunction((prev) => ({ ...prev, [functionId]: running }));
  };

  const executeFunction = async (capability, payloadText) => {
    const functionId = capability.function_id;
    let parsedPayload = {};

    try {
      parsedPayload = payloadText?.trim() ? JSON.parse(payloadText) : {};
    } catch {
      const detail = "Payload must be valid JSON.";
      pushTimeline({
        id: `${Date.now()}-${functionId}-invalid-json`,
        at: toLocalClock(),
        label: functionId,
        status: "blocked",
        detail,
      });
      setResultByFunction((prev) => ({ ...prev, [functionId]: { error: detail } }));
      return;
    }

    pushTimeline({
      id: `${Date.now()}-${functionId}-queued`,
      at: toLocalClock(),
      label: functionId,
      status: "queued",
      detail: toTimelineDetail(parsedPayload),
    });
    setRunning(functionId, true);

    try {
      const response = await base44.functions.invoke(functionId, parsedPayload);
      const payload = response?.data || {};
      const hasError = Boolean(payload?.error);
      if (hasError) {
        throw new Error(payload.error || "Function execution failed.");
      }

      setResultByFunction((prev) => ({ ...prev, [functionId]: payload }));
      pushTimeline({
        id: `${Date.now()}-${functionId}-ok`,
        at: toLocalClock(),
        label: functionId,
        status: "success",
        detail: toTimelineDetail(payload),
      });

      await writeAuditEvent({
        function_id: functionId,
        status: "success",
        actor_role: capabilitiesQuery.user?.role || "unknown",
        payload: parsedPayload,
        response: payload,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Function execution failed.";
      setResultByFunction((prev) => ({ ...prev, [functionId]: { error: message } }));
      pushTimeline({
        id: `${Date.now()}-${functionId}-failed`,
        at: toLocalClock(),
        label: functionId,
        status: "failed",
        detail: message,
      });

      await writeAuditEvent({
        function_id: functionId,
        status: "failed",
        actor_role: capabilitiesQuery.user?.role || "unknown",
        payload: parsedPayload,
        error: message,
        executed_at: new Date().toISOString(),
      });
    } finally {
      setRunning(functionId, false);
    }
  };

  const handleExecuteClick = (capability) => {
    const functionId = capability.function_id;
    const payloadText = payloadByFunction[functionId] || "{}";

    if (capability.confirmation_required || capability.risk_level === "critical") {
      setConfirmState({ capability, payloadText, token: "" });
      return;
    }

    executeFunction(capability, payloadText);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <PageHeader icon={RadioTower} title="FUNCTION CONTROL MATRIX" color={T.cyan}>
        <StatusBadge label={`ROLE: ${(capabilitiesQuery.user?.role || "unknown").toUpperCase()}`} color={capabilitiesQuery.user?.role === "admin" ? T.red : T.green} />
        {capabilitiesQuery.user?.clan_role && (
          <StatusBadge label={`CLAN: ${String(capabilitiesQuery.user.clan_role).toUpperCase()}`} color={T.cyan} />
        )}
        {capabilitiesQuery.user?.tactical_writer && (
          <StatusBadge label="TACTICAL-WRITER" color={T.amber} />
        )}
      </PageHeader>

      <LiveStatusStrip
        label="CAPABILITY REGISTRY"
        source={capabilitiesQuery.isError ? "unavailable" : "live"}
        retrievedAt={capabilitiesQuery.retrievedAt}
        loading={capabilitiesQuery.isLoading || capabilitiesQuery.isFetching}
        error={capabilitiesQuery.error?.message || null}
        staleAfterMs={30_000}
        onRetry={capabilitiesQuery.refetch}
        extraBadges={[
          { label: `${capabilities.length} FUNCTIONS`, color: T.cyan },
          { label: `${timeline.length} AUDIT EVENTS`, color: T.textDim },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {groupedBySurface.map((group) => {
          const Icon = SURFACE_ICONS[group.surface] || Terminal;
          const active = selectedSurface === group.surface;
          return (
            <button
              key={group.surface}
              type="button"
              onClick={() => setSelectedSurface(group.surface)}
              className="border px-3 py-2 inline-flex items-center gap-2"
              style={{
                borderColor: active ? T.cyan : T.border,
                background: active ? T.cyan + "15" : "transparent",
                color: active ? T.cyan : T.textDim,
                fontSize: "10px",
                letterSpacing: "0.08em",
              }}
            >
              <Icon size={11} />
              {group.title.toUpperCase()} ({group.capabilities.length})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          {!selectedGroup && (
            <Panel title="FUNCTIONS" titleColor={T.textDim}>
              <div className="p-3" style={{ color: T.textFaint, fontSize: "10px" }}>
                No capability surface selected.
              </div>
            </Panel>
          )}

          {selectedGroup?.capabilities.map((capability) => {
            const functionId = capability.function_id;
            const running = runningByFunction[functionId] === true;
            const result = resultByFunction[functionId];
            const riskColor = RISK_COLORS[capability.risk_level] || T.textDim;
            const Icon = SURFACE_ICONS[capability.ui_surface] || Terminal;

            return (
              <Panel key={functionId} title={capability.title} titleColor={riskColor}>
                <div className="p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={capability.required_role.toUpperCase()} color={roleBadgeColor(capability.required_role)} />
                    <StatusBadge label={capability.risk_level.toUpperCase()} color={riskColor} />
                    <StatusBadge label={capability.observable_only ? "OBSERVE" : "EXECUTE"} color={capability.observable_only ? T.cyan : T.amber} />
                    {!capability.executable && <StatusBadge label="LOCKED" color={T.red} />}
                    <span className="ml-auto inline-flex items-center gap-1" style={{ color: T.textFaint, fontSize: "9px" }}>
                      <Icon size={10} />
                      {capability.ui_surface}
                    </span>
                  </div>

                  <div style={{ color: T.textDim, fontSize: "10px" }}>{capability.description}</div>

                  <PermissionGate allowed={capability.executable} message={roleMessage(capability)}>
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        <div>
                          <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: "4px", letterSpacing: "0.08em" }}>
                            INPUT SCHEMA
                          </div>
                          <pre className="border p-2 whitespace-pre-wrap" style={{ borderColor: T.border, color: T.textFaint, fontSize: "9px", background: "rgba(0,0,0,0.25)" }}>
                            {toSchemaSummary(capability.input_schema)}
                          </pre>
                        </div>
                        <div>
                          <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: "4px", letterSpacing: "0.08em" }}>
                            OUTPUT SCHEMA
                          </div>
                          <pre className="border p-2 whitespace-pre-wrap" style={{ borderColor: T.border, color: T.textFaint, fontSize: "9px", background: "rgba(0,0,0,0.25)" }}>
                            {toSchemaSummary(capability.output_schema)}
                          </pre>
                        </div>
                      </div>

                      <textarea
                        value={payloadByFunction[functionId] || "{}"}
                        onChange={(event) => setPayloadByFunction((prev) => ({ ...prev, [functionId]: event.target.value }))}
                        className="w-full border p-2 text-xs"
                        style={{
                          borderColor: T.border,
                          color: T.text,
                          minHeight: "110px",
                          background: "rgba(0,0,0,0.35)",
                          fontFamily: "'Share Tech Mono', monospace",
                        }}
                      />

                      <div className="flex flex-wrap gap-2">
                        <ActionBtn
                          color={riskColor}
                          onClick={() => handleExecuteClick(capability)}
                          disabled={running}
                        >
                          {running ? "RUNNING..." : capability.observable_only ? "OBSERVE LIVE" : "EXECUTE"}
                        </ActionBtn>
                        <ActionBtn
                          color={T.textDim}
                          onClick={() => setPayloadByFunction((prev) => ({
                            ...prev,
                            [functionId]: JSON.stringify(getFunctionPayloadTemplate(functionId), null, 2),
                          }))}
                          small
                        >
                          RESET PAYLOAD
                        </ActionBtn>
                      </div>
                    </div>
                  </PermissionGate>

                  {result && (
                    <div>
                      <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: "4px", letterSpacing: "0.08em" }}>
                        LAST RESPONSE
                      </div>
                      <pre className="border p-2 whitespace-pre-wrap" style={{ borderColor: T.border, color: result.error ? T.red : T.green, fontSize: "9px", background: "rgba(0,0,0,0.25)" }}>
                        {toTimelineDetail(result)}
                      </pre>
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>

        <div className="space-y-3">
          <Panel title="EXECUTION TIMELINE" titleColor={T.cyan}>
            <ExecutionTimeline events={timeline} />
          </Panel>
        </div>
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl border p-4 space-y-3" style={{ borderColor: T.red + "77", background: T.bg1 }}>
            <div style={{ color: T.red, fontSize: "12px", letterSpacing: "0.12em", fontFamily: "'Orbitron', monospace" }}>
              CONFIRM HIGH-RISK ACTION
            </div>
            <div style={{ color: T.textDim, fontSize: "11px" }}>
              {confirmState.capability.title} ({confirmState.capability.function_id}) requires explicit confirmation.
              Type <span style={{ color: T.red, fontFamily: "'Orbitron', monospace" }}>EXECUTE</span> to continue.
            </div>
            <textarea
              value={confirmState.payloadText}
              onChange={(event) => setConfirmState((prev) => ({ ...prev, payloadText: event.target.value }))}
              className="w-full border p-2 text-xs"
              style={{
                borderColor: T.border,
                color: T.text,
                minHeight: "120px",
                background: "rgba(0,0,0,0.35)",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            />
            <input
              value={confirmState.token}
              onChange={(event) => setConfirmState((prev) => ({ ...prev, token: event.target.value }))}
              className="w-full border px-2 py-1.5 text-xs"
              style={{ borderColor: T.border, color: T.text, background: "rgba(0,0,0,0.35)" }}
              placeholder="Type EXECUTE"
            />
            <div className="flex gap-2 justify-end">
              <ActionBtn color={T.textDim} onClick={() => setConfirmState(null)} small>
                CANCEL
              </ActionBtn>
              <ActionBtn
                color={T.red}
                disabled={confirmState.token.trim().toUpperCase() !== "EXECUTE"}
                onClick={() => {
                  executeFunction(confirmState.capability, confirmState.payloadText);
                  setConfirmState(null);
                }}
              >
                EXECUTE NOW
              </ActionBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
