const TEMPLATES = {
  getServerStatus: {},
  getFleetStatus: { include_details: true },
  getLiveTelemetry: { window_minutes: 60, include_rollups: true, include_source_health: true },
  getRuntimeConfig: {},
  sendRconCommand: { command: "status", target_id: "", idempotency_key: "" },
  controlServerPower: { signal: "restart", target_id: "", idempotency_key: "" },
  requestRconApproval: { command: "restart", reason: "Scheduled maintenance", target_id: "" },
  approveRconApproval: { approval_id: "approval-id" },
  getPanelWebsocketAuth: { target_id: "" },
  capturePanelWebsocketSample: { target_id: "", duration_seconds: 10, persist: true },
  syncLiveData: {
    target_id: "",
    include_files: false,
    files_directory: "/",
    include_external: true,
    persist: true,
  },
  ingestLiveTelemetry: {
    target_id: "",
    include_details: true,
    persist_sample: true,
    persist_source_health: true,
  },
  rollupLiveTelemetry: { target_id: "", bucket_minutes: 1, lookback_minutes: 180 },
  cleanupLiveTelemetry: { sample_retention_hours: 24, rollup_retention_days: 30 },
  logServerPerformance: { target_id: "" },
  runAutomationCycle: {
    target_id: "",
    dry_run: true,
    include_external: true,
    auto_recover_if_offline: false,
  },
  checkAlerts: { target_id: "", dry_run: true, run_remediation: false },
  executeScheduledCommand: { scheduled_command_id: "scheduled-command-id" },
  scheduleServerRestart: {
    restartType: "performance",
    cpuThreshold: 85,
    memThreshold: 90,
    gracefulWait: 60,
    dry_run: true,
  },
  automateServerResponse: {
    alertType: "HIGH_CPU",
    severity: "CRITICAL",
    metric: "cpu",
    value: 95,
    dry_run: true,
  },
  checkStackSecurity: {},
  anomalyDetection: { sample_size: 300 },
  analyzeServerLogs: {},
  playerBehaviorAnalysis: {},
  suggestRconCommands: {
    context: { state: "running", cpu: 42, ramUsedMB: 2048 },
    recentEvents: [],
  },
  gameKnowledgeBot: { question: "Best early-game survival priorities in HumanitZ?" },
  generateIntelSummary: { summary_type: "server_events" },
  synthesizeIntel: {},
  generateMissionBriefing: { missionTitle: "Outpost Sweep", objectiveCoords: "42,78" },
  optimizeTacticalPlan: {},
  predictResourceNeeds: {},
  personalizedActivitySummary: {},
  generateAnnouncement: { topic: "Maintenance", context: "Server reboot at 03:00 UTC." },
  updatePlayerLocation: { x: 50, y: 50, callsign: "Alpha-1", in_vehicle: false },
  ingestPlayerTelemetry: {
    source: "bisect_feed",
    timestamp: new Date().toISOString(),
    map_id: "global-map",
    players: [
      {
        player_callsign: "Alpha-1",
        normalized_x: 50,
        normalized_y: 50,
        world_x: 0,
        world_y: 0,
        in_vehicle: false,
      },
    ],
  },
  getMapRuntimeConfig: {},
  setMapRuntimeConfig: {
    config: {
      map_id: "global-map",
      image_url: "https://example.com/map.png",
      image_width_px: 4096,
      image_height_px: 4096,
      world_bounds: { min_x: 0, max_x: 10000, min_y: 0, max_y: 10000 },
      control_points: [
        {
          id: "cp-1",
          image: { x: 0, y: 0 },
          world: { x: 0, y: 0 },
        },
        {
          id: "cp-2",
          image: { x: 4096, y: 4096 },
          world: { x: 10000, y: 10000 },
        },
      ],
    },
  },
  mutateMapDomain: {
    action: "create_pin",
    payload: {
      title: "Sample Pin",
      type: "Objective",
      status: "Active",
      map_id: "global-map",
      x: 50,
      y: 50,
    },
    dry_run: true,
    idempotency_key: "",
  },
  getFunctionCapabilities: {},
};

export const FUNCTION_PAYLOAD_TEMPLATES = TEMPLATES;

export const getFunctionPayloadTemplate = (functionId) => {
  const template = FUNCTION_PAYLOAD_TEMPLATES[functionId];
  if (!template) {
    return {};
  }
  return JSON.parse(JSON.stringify(template));
};
