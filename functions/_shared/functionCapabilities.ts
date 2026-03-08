export type CapabilityRole = "authenticated" | "admin" | "tactical_writer";
export type CapabilityRisk = "safe" | "elevated" | "high" | "critical";
export type CapabilitySurface =
  | "ops_center"
  | "telemetry_pipeline_lab"
  | "security_diagnostics"
  | "ai_intel_studio"
  | "field_ops";

export interface CapabilitySchemaField {
  field: string;
  type: string;
  required: boolean;
  description: string;
}

interface CapabilitySchemas {
  input_schema: CapabilitySchemaField[];
  output_schema: CapabilitySchemaField[];
}

export interface FunctionCapability {
  function_id: string;
  title: string;
  description: string;
  ui_surface: CapabilitySurface;
  required_role: CapabilityRole;
  risk_level: CapabilityRisk;
  confirmation_required: boolean;
  observable_only: boolean;
  input_schema: CapabilitySchemaField[];
  output_schema: CapabilitySchemaField[];
}

export interface ResolvedFunctionCapability extends FunctionCapability {
  executable: boolean;
}

type CapabilitySeed = Omit<FunctionCapability, "input_schema" | "output_schema">;

const CAPABILITIES: CapabilitySeed[] = [
  {
    function_id: "getServerStatus",
    title: "Server Status",
    description: "Get current server runtime metrics and source freshness envelopes.",
    ui_surface: "ops_center",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
  {
    function_id: "getFleetStatus",
    title: "Fleet Status",
    description: "Get live runtime status across all configured panel targets.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
  {
    function_id: "getLiveTelemetry",
    title: "Live Telemetry",
    description: "Read telemetry current state, samples, rollups, and source health.",
    ui_surface: "ops_center",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
  {
    function_id: "getRuntimeConfig",
    title: "Runtime Config",
    description: "Read global runtime configuration used by dynamic UI and features.",
    ui_surface: "ops_center",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
  {
    function_id: "sendRconCommand",
    title: "Dispatch RCON Command",
    description: "Send an RCON command with rate limit, policy, and approval enforcement.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "controlServerPower",
    title: "Server Power Control",
    description: "Issue start, stop, restart, or kill power signals to the server.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "critical",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "requestRconApproval",
    title: "Request RCON Approval",
    description: "Create a second-admin approval request for sensitive commands.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "approveRconApproval",
    title: "Approve RCON Request",
    description: "Approve a pending sensitive command request for delegated execution.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "getPanelWebsocketAuth",
    title: "Panel Websocket Auth",
    description: "Fetch websocket token/socket details for live server stream consumers.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: true,
  },
  {
    function_id: "capturePanelWebsocketSample",
    title: "Capture Stream Sample",
    description: "Capture a short websocket event sample for diagnostics and ingestion checks.",
    ui_surface: "ops_center",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "syncLiveData",
    title: "Sync Live Data",
    description: "Run comprehensive sync across panel endpoints and optional external sources.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "ingestLiveTelemetry",
    title: "Ingest Telemetry",
    description: "Ingest and persist telemetry current state and optional sampling records.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "rollupLiveTelemetry",
    title: "Rollup Telemetry",
    description: "Aggregate telemetry samples into bucketed rollups for long-window analysis.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "cleanupLiveTelemetry",
    title: "Cleanup Telemetry",
    description: "Apply telemetry retention cleanup to sample and rollup entities.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "logServerPerformance",
    title: "Log Performance Snapshot",
    description: "Record a point-in-time performance entry from provider-derived metrics.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "runAutomationCycle",
    title: "Run Automation Cycle",
    description: "Run sync, alert checks, and optional auto-recovery actions.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "checkAlerts",
    title: "Check Alerts",
    description: "Evaluate active alert rules and optionally run remediation commands.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "executeScheduledCommand",
    title: "Execute Scheduled Command",
    description: "Execute a scheduled command record and update its status metadata.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "scheduleServerRestart",
    title: "Schedule Server Restart",
    description: "Queue or execute restart workflow with policy-driven timing and checks.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "critical",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "automateServerResponse",
    title: "Automate Server Response",
    description: "Trigger automation actions from alert context and remediation policies.",
    ui_surface: "telemetry_pipeline_lab",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "checkStackSecurity",
    title: "Check Stack Security",
    description: "Check panel/wings versions against latest releases and advisories.",
    ui_surface: "security_diagnostics",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
  {
    function_id: "anomalyDetection",
    title: "Anomaly Detection",
    description: "Analyze server performance logs for suspicious resource anomalies.",
    ui_surface: "security_diagnostics",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "analyzeServerLogs",
    title: "Analyze Server Logs",
    description: "Analyze recent server event logs and return actionable findings.",
    ui_surface: "security_diagnostics",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "playerBehaviorAnalysis",
    title: "Player Behavior Analysis",
    description: "Analyze player activity data for toxicity/griefing risk patterns.",
    ui_surface: "security_diagnostics",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "suggestRconCommands",
    title: "Suggest RCON Commands",
    description: "Generate contextual command suggestions based on current server state.",
    ui_surface: "security_diagnostics",
    required_role: "admin",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "gameKnowledgeBot",
    title: "Game Knowledge Bot",
    description: "Answer game knowledge questions using configured AI prompt behavior.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "generateIntelSummary",
    title: "Generate Intel Summary",
    description: "Generate a structured summary of selected gameplay/server activity streams.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "synthesizeIntel",
    title: "Synthesize Intel",
    description: "Produce synthesized insights from multi-source events and activity logs.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "generateMissionBriefing",
    title: "Generate Mission Briefing",
    description: "Create structured mission briefings from current operations context.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "optimizeTacticalPlan",
    title: "Optimize Tactical Plan",
    description: "Generate tactical optimization recommendations for planned operations.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "predictResourceNeeds",
    title: "Predict Resource Needs",
    description: "Predict future resource demand from current inventory and activity signals.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "personalizedActivitySummary",
    title: "Personalized Activity Summary",
    description: "Generate personalized weekly activity summaries for players.",
    ui_surface: "ai_intel_studio",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "generateAnnouncement",
    title: "Generate Announcement",
    description: "Generate admin-grade announcement content for in-app broadcast use.",
    ui_surface: "ai_intel_studio",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "updatePlayerLocation",
    title: "Update Player Location",
    description: "Update authenticated player live location telemetry for tactical map sync.",
    ui_surface: "field_ops",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: false,
  },
  {
    function_id: "ingestPlayerTelemetry",
    title: "Ingest Player Telemetry",
    description: "Ingest server-side player telemetry coordinates and upsert map player tracks.",
    ui_surface: "field_ops",
    required_role: "admin",
    risk_level: "elevated",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "getMapRuntimeConfig",
    title: "Get Map Runtime Config",
    description: "Read live map asset, calibration, and world-scale transformation metadata.",
    ui_surface: "field_ops",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
  {
    function_id: "setMapRuntimeConfig",
    title: "Set Map Runtime Config",
    description: "Create or update map asset/calibration configuration used by tactical map renderer.",
    ui_surface: "field_ops",
    required_role: "admin",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "mutateMapDomain",
    title: "Mutate Map Domain",
    description: "Execute tactical map domain mutations with role checks, dry-run support, and idempotent writes.",
    ui_surface: "field_ops",
    required_role: "tactical_writer",
    risk_level: "high",
    confirmation_required: true,
    observable_only: false,
  },
  {
    function_id: "getFunctionCapabilities",
    title: "Get Function Capabilities",
    description: "Return executable capability matrix for current user role and UI surfaces.",
    ui_surface: "field_ops",
    required_role: "authenticated",
    risk_level: "safe",
    confirmation_required: false,
    observable_only: true,
  },
];

const schemaField = (
  field: string,
  type: string,
  required: boolean,
  description: string,
): CapabilitySchemaField => ({ field, type, required, description });

const DEFAULT_OUTPUT_SCHEMA: CapabilitySchemaField[] = [
  schemaField("success", "boolean", false, "Operation success status when provided by the function."),
  schemaField("error", "string", false, "Error message when operation fails."),
];

const DEFAULT_SCHEMAS: CapabilitySchemas = {
  input_schema: [],
  output_schema: DEFAULT_OUTPUT_SCHEMA,
};

const CAPABILITY_SCHEMAS: Record<string, CapabilitySchemas> = {
  getServerStatus: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
    ],
    output_schema: [
      schemaField("online", "boolean", false, "Server online/offline state."),
      schemaField("stale", "boolean", true, "Whether returned metric envelopes are stale."),
      schemaField("metrics", "object", true, "Per-metric source/freshness/value envelope."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  getFleetStatus: {
    input_schema: [
      schemaField("include_details", "boolean", false, "Include panel details summary."),
    ],
    output_schema: [
      schemaField("fleet", "array", true, "Status rows for configured panel targets."),
      schemaField("totals", "object", true, "Live/unavailable target summary."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  getLiveTelemetry: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("window_minutes", "number", false, "Lookback window for samples/rollups."),
      schemaField("include_rollups", "boolean", false, "Include rollup buckets in response."),
      schemaField("include_source_health", "boolean", false, "Include source-health entries."),
    ],
    output_schema: [
      schemaField("current", "object", true, "Current telemetry snapshot with stale metadata."),
      schemaField("samples", "array", true, "Recent telemetry sample points."),
      schemaField("rollups", "array", true, "Aggregated telemetry windows."),
      schemaField("source_health", "array", true, "Source availability checks."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  getRuntimeConfig: {
    input_schema: [],
    output_schema: [
      schemaField("source", "string", true, "Runtime config data source."),
      schemaField("config", "object", true, "Resolved runtime config payload."),
      schemaField("updated_at", "string", true, "Config last-updated timestamp."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  sendRconCommand: {
    input_schema: [
      schemaField("command", "string", true, "RCON command to dispatch."),
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("idempotency_key", "string", false, "Replay-safe idempotency key."),
      schemaField("approval_id", "string", false, "Approval id for sensitive command execution."),
    ],
    output_schema: [
      schemaField("output", "string", false, "Provider dispatch result message."),
      schemaField("target_id", "string", true, "Resolved panel target id."),
      schemaField("command_policy", "object", true, "Sensitive/blocked policy metadata."),
      schemaField("approval", "object", false, "Approval metadata when used."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  controlServerPower: {
    input_schema: [
      schemaField("signal", "string", true, "Power signal: start|stop|restart|kill."),
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("idempotency_key", "string", false, "Replay-safe idempotency key."),
    ],
    output_schema: [
      schemaField("signal", "string", true, "Resolved power signal."),
      schemaField("target_id", "string", true, "Resolved panel target id."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  requestRconApproval: {
    input_schema: [
      schemaField("command", "string", true, "Sensitive command requiring approval."),
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("reason", "string", false, "Optional reason shown to second admin."),
    ],
    output_schema: [
      schemaField("approval_required", "boolean", true, "Whether policy requires approval."),
      schemaField("approval", "object", false, "Approval request object when required."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  approveRconApproval: {
    input_schema: [
      schemaField("approval_id", "string", true, "Pending approval request id."),
    ],
    output_schema: [
      schemaField("approval", "object", true, "Approved request payload."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  getPanelWebsocketAuth: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
    ],
    output_schema: [
      schemaField("socket", "string", true, "Websocket endpoint URL."),
      schemaField("token", "string", true, "Websocket auth token."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  capturePanelWebsocketSample: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("duration_seconds", "number", false, "Capture duration in seconds."),
      schemaField("persist", "boolean", false, "Persist captured sample record."),
    ],
    output_schema: [
      schemaField("events", "array", true, "Captured websocket events."),
      schemaField("event_count", "number", true, "Captured event count."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  syncLiveData: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("include_files", "boolean", false, "Include panel file listing endpoint."),
      schemaField("files_directory", "string", false, "Panel directory path for file listing."),
      schemaField("include_external", "boolean", false, "Include configured external live sources."),
      schemaField("persist", "boolean", false, "Persist sync artifacts/entities."),
    ],
    output_schema: [
      schemaField("source_summary", "object", true, "Live/unavailable source counts."),
      schemaField("metrics", "object", true, "Normalized live metrics with availability."),
      schemaField("sources", "object", true, "Per-source payload status."),
      schemaField("persistence", "object", true, "Persistence result metadata."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  ingestLiveTelemetry: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("include_details", "boolean", false, "Collect server details alongside resources."),
      schemaField("persist_sample", "boolean", false, "Persist telemetry sample row."),
      schemaField("persist_source_health", "boolean", false, "Persist source health records."),
    ],
    output_schema: [
      schemaField("current", "object", true, "Upserted telemetry current record."),
      schemaField("sample_id", "string", false, "Created telemetry sample id."),
      schemaField("sources", "array", true, "Source health rows from ingestion run."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  rollupLiveTelemetry: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("bucket_minutes", "number", false, "Rollup bucket width in minutes."),
      schemaField("lookback_minutes", "number", false, "Sample lookback window in minutes."),
    ],
    output_schema: [
      schemaField("sample_count", "number", true, "Samples included in rollup process."),
      schemaField("rollup_count", "number", true, "Buckets persisted."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  cleanupLiveTelemetry: {
    input_schema: [
      schemaField("sample_retention_hours", "number", false, "Telemetry sample retention hours."),
      schemaField("rollup_retention_days", "number", false, "Telemetry rollup retention days."),
    ],
    output_schema: [
      schemaField("deleted_samples", "number", true, "Deleted sample row count."),
      schemaField("deleted_rollups", "number", true, "Deleted rollup row count."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  logServerPerformance: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
    ],
    output_schema: [
      schemaField("performanceLog", "object", true, "Created performance log row."),
      schemaField("metric_source", "object", true, "Per-metric source map."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  runAutomationCycle: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("dry_run", "boolean", false, "Disable writes and control actions."),
      schemaField("include_external", "boolean", false, "Include external live sources in sync."),
      schemaField("auto_recover_if_offline", "boolean", false, "Attempt restart when server is offline."),
    ],
    output_schema: [
      schemaField("sync", "object", true, "Sync phase summary."),
      schemaField("alerts", "object", true, "Alert phase summary."),
      schemaField("recovery_actions", "array", true, "Automation recovery actions."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  checkAlerts: {
    input_schema: [
      schemaField("target_id", "string", false, "Configured panel target id."),
      schemaField("dry_run", "boolean", false, "Run without persisting side effects."),
      schemaField("run_remediation", "boolean", false, "Execute configured remediation commands."),
    ],
    output_schema: [
      schemaField("triggered", "array", true, "Triggered alert rows."),
      schemaField("skipped", "array", true, "Skipped alert rows with reasons."),
      schemaField("currentValues", "object", true, "Current metric values used for checks."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  executeScheduledCommand: {
    input_schema: [
      schemaField("scheduled_command_id", "string", true, "Scheduled command entity id."),
    ],
    output_schema: [
      schemaField("command", "object", true, "Updated scheduled command row."),
      schemaField("rconResponse", "object", false, "RCON response for executed command."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  scheduleServerRestart: {
    input_schema: [
      schemaField("restartType", "string", false, "Restart decision mode: performance|scheduled."),
      schemaField("cpuThreshold", "number", false, "CPU threshold for performance-based restart."),
      schemaField("memThreshold", "number", false, "Memory threshold for performance-based restart."),
      schemaField("gracefulWait", "number", false, "Grace period before dispatching restart."),
      schemaField("dry_run", "boolean", false, "Preview restart workflow without execution."),
    ],
    output_schema: [
      schemaField("restart_needed", "boolean", false, "Whether restart criteria were met."),
      schemaField("restart_initiated", "boolean", false, "Whether restart command was sent."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  automateServerResponse: {
    input_schema: [
      schemaField("alertType", "string", true, "Alert type identifier."),
      schemaField("severity", "string", false, "Alert severity context."),
      schemaField("metric", "string", false, "Metric key that triggered alert."),
      schemaField("value", "number", false, "Metric value at alert trigger time."),
      schemaField("dry_run", "boolean", false, "Preview planned actions without execution."),
    ],
    output_schema: [
      schemaField("actions_planned", "array", true, "Planned automation actions."),
      schemaField("actions_executed", "array", true, "Executed actions and downstream results."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  checkStackSecurity: {
    input_schema: [],
    output_schema: [
      schemaField("current", "object", true, "Configured current panel/wings versions."),
      schemaField("latest", "object", true, "Latest release tags from upstream."),
      schemaField("update_status", "object", true, "Upgrade recommendation metadata."),
      schemaField("advisories", "array", true, "Known advisory references."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  anomalyDetection: {
    input_schema: [
      schemaField("sample_size", "number", false, "Maximum sample rows analyzed."),
    ],
    output_schema: [
      schemaField("anomalies", "array", true, "Detected anomaly objects."),
      schemaField("baselines", "object", true, "Computed baseline statistics."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  analyzeServerLogs: {
    input_schema: [],
    output_schema: [
      schemaField("critical_issues", "array", true, "Critical findings from log analysis."),
      schemaField("recommendations", "array", true, "Actionable recommendations."),
      schemaField("overall_severity", "string", true, "Aggregate severity level."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  playerBehaviorAnalysis: {
    input_schema: [],
    output_schema: [
      schemaField("flagged_players", "array", true, "Flagged behavior review rows."),
      schemaField("patterns", "array", true, "Observed behavior patterns."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  suggestRconCommands: {
    input_schema: [
      schemaField("context", "object", false, "Current server status context."),
      schemaField("serverStatus", "object", false, "Backward-compatible server status alias."),
      schemaField("recentEvents", "array", false, "Recent event list for prompt context."),
    ],
    output_schema: [
      schemaField("commands", "array", true, "Suggested command and reason list."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  gameKnowledgeBot: {
    input_schema: [
      schemaField("question", "string", true, "User gameplay question."),
    ],
    output_schema: [
      schemaField("answer", "string", true, "Generated answer."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  generateIntelSummary: {
    input_schema: [
      schemaField("summary_type", "string", false, "Summary mode: server_events|clan_activity."),
    ],
    output_schema: [
      schemaField("summary", "string", true, "Generated summary text."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  synthesizeIntel: {
    input_schema: [],
    output_schema: [
      schemaField("critical_alerts", "array", true, "Generated critical alert list."),
      schemaField("actionable_items", "array", true, "Actionable recommendations."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  generateMissionBriefing: {
    input_schema: [
      schemaField("missionTitle", "string", true, "Mission title."),
      schemaField("objectiveCoords", "string", false, "Objective coordinate string."),
    ],
    output_schema: [
      schemaField("briefing", "string", true, "Generated mission briefing."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  optimizeTacticalPlan: {
    input_schema: [],
    output_schema: [
      schemaField("strategy", "string", true, "High-level tactical recommendation."),
      schemaField("positioning", "array", true, "Player-by-player positioning guidance."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  predictResourceNeeds: {
    input_schema: [],
    output_schema: [
      schemaField("shortages", "array", true, "Forecasted shortage items."),
      schemaField("recommendations", "array", true, "Resource planning recommendations."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  personalizedActivitySummary: {
    input_schema: [],
    output_schema: [
      schemaField("summary", "string", true, "Personalized activity summary."),
      schemaField("highlights", "array", true, "Weekly highlights."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  generateAnnouncement: {
    input_schema: [
      schemaField("topic", "string", true, "Announcement topic."),
      schemaField("context", "string", false, "Additional context for generation."),
    ],
    output_schema: [
      schemaField("title", "string", true, "Generated title."),
      schemaField("body", "string", true, "Generated body."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  updatePlayerLocation: {
    input_schema: [
      schemaField("x", "number", true, "Normalized X coordinate (0-100)."),
      schemaField("y", "number", true, "Normalized Y coordinate (0-100)."),
      schemaField("callsign", "string", false, "Admin-only callsign override."),
      schemaField("in_vehicle", "boolean", false, "Vehicle status for marker."),
      schemaField("world_x", "number", false, "Optional world-space X coordinate."),
      schemaField("world_y", "number", false, "Optional world-space Y coordinate."),
      schemaField("map_id", "string", false, "Target map id for location heartbeat."),
      schemaField("telemetry_source", "string", false, "Telemetry source label for write provenance."),
    ],
    output_schema: [
      schemaField("location", "object", true, "Created/updated location record."),
      schemaField("player_callsign", "string", true, "Resolved callsign for write."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  ingestPlayerTelemetry: {
    input_schema: [
      schemaField("source", "string", false, "Telemetry source identifier."),
      schemaField("timestamp", "string", false, "Telemetry timestamp."),
      schemaField("map_id", "string", false, "Map id for ingested records."),
      schemaField("players", "array", true, "Player telemetry array for bulk upsert."),
    ],
    output_schema: [
      schemaField("ingested_count", "number", true, "Count of ingested players."),
      schemaField("players", "array", true, "Normalized ingested player rows."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  getMapRuntimeConfig: {
    input_schema: [],
    output_schema: [
      schemaField("source", "string", true, "Map config source state."),
      schemaField("version", "number", false, "Map runtime config version."),
      schemaField("config", "object", false, "Map runtime configuration."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  setMapRuntimeConfig: {
    input_schema: [
      schemaField("config", "object", true, "Map config payload with bounds/control points."),
    ],
    output_schema: [
      schemaField("config", "object", true, "Saved map runtime config."),
      schemaField("updated_at", "string", true, "Config updated timestamp."),
      schemaField("version", "number", true, "Incremented config version."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  mutateMapDomain: {
    input_schema: [
      schemaField("action", "string", true, "Mutation action id."),
      schemaField("payload", "object", false, "Action-specific payload."),
      schemaField("payload.expected_updated_at", "string", false, "Optional optimistic concurrency revision for update/delete actions."),
      schemaField("dry_run", "boolean", false, "Validate mutation without persisting side effects."),
      schemaField("confirm_token", "string", false, "Explicit confirmation token for critical reset actions."),
      schemaField("idempotency_key", "string", false, "Replay-safe idempotency key."),
    ],
    output_schema: [
      schemaField("action", "string", true, "Resolved mutation action id."),
      schemaField("dry_run", "boolean", true, "Dry-run mode status."),
      schemaField("result", "object", true, "Action execution result payload."),
      schemaField("executed_at", "string", true, "Execution timestamp."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
  getFunctionCapabilities: {
    input_schema: [],
    output_schema: [
      schemaField("user", "object", true, "Authenticated user summary."),
      schemaField("capabilities", "array", true, "Resolved capability matrix with execute flags."),
      ...DEFAULT_OUTPUT_SCHEMA,
    ],
  },
};

const CAPABILITIES_WITH_SCHEMAS: FunctionCapability[] = CAPABILITIES.map((capability) => {
  const schemas = CAPABILITY_SCHEMAS[capability.function_id] || DEFAULT_SCHEMAS;
  return {
    ...capability,
    input_schema: schemas.input_schema,
    output_schema: schemas.output_schema,
  };
});

const byId = new Map(CAPABILITIES_WITH_SCHEMAS.map((capability) => [capability.function_id, capability]));

export const listFunctionCapabilities = (): FunctionCapability[] =>
  CAPABILITIES_WITH_SCHEMAS.map((capability) => ({ ...capability }));

export const getFunctionCapability = (functionId: string): FunctionCapability | null => {
  const capability = byId.get(functionId);
  return capability ? { ...capability } : null;
};

export const listResolvedCapabilities = (
  role: string | null | undefined,
  options: { tactical_writer?: boolean } = {},
): ResolvedFunctionCapability[] => {
  const isAdmin = role === "admin";
  const isTacticalWriter = options.tactical_writer === true;
  return CAPABILITIES_WITH_SCHEMAS.map((capability) => ({
    ...capability,
    executable: capability.required_role === "authenticated"
      ? true
      : capability.required_role === "admin"
      ? isAdmin
      : (isAdmin || isTacticalWriter),
  }));
};
