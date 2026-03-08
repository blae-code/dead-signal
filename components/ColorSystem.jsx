/**
 * Dead Signal Protocol — Comprehensive Color System
 * Hybrid approach: Core palette + context-specific overrides
 * 
 * Design principles:
 * - Military/tactical aesthetic (neon accents, dark backgrounds)
 * - Clear semantic meaning (every color conveys information)
 * - Fast visual scanning (distinct colors for different entity types)
 * - Role & status distinction (immediate authority/state recognition)
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE PALETTE — Military-grade neon spectrum
// ═══════════════════════════════════════════════════════════════════════════

export const CORE = {
  // ── Status spectrum (universal meaning across app)
  operational:  "#39ff14",  // Phosphor green — GO / CLEAR
  standby:      "#ffaa00",  // Amber — READY / CAUTION
  critical:     "#ff2020",  // Hard red — STOP / DANGER
  info:         "#00e8ff",  // Cyan — INTEL / COMMS
  warning:      "#ff6a00",  // Orange — ALERT / ELEVATED
  success:      "#39ff14",  // Green — COMPLETED
  pending:      "#e8b800",  // Gold — WAITING / PROCESSING
  error:        "#ff2020",  // Red — FAILED

  // ── Secondary spectrum (tactical emphasis)
  olive:        "#00c8a0",  // Field olive — INTEL / ANALYSIS
  teal:         "#00c8a0",  // Military teal — LOGISTICS / SUPPLY
  steel:        "#00e8ff",  // Cold steel — SYSTEMS / DATA
  gold:         "#e8b800",  // Tactical gold — LOOT / VALUE
  violet:       "#b060ff",  // Purple — INTELLIGENCE / ANALYSIS
  pink:         "#ff3090",  // Magenta — SIGNALS / EVENTS
  emerald:      "#39ff14",  // Bright emerald — ACTIVE ENGAGEMENT
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY COLOR MAPPING — Every entity type gets a distinct color
// ═══════════════════════════════════════════════════════════════════════════

export const ENTITY_COLORS = {
  // ── Personnel & Organization
  ClanMember:               "#39ff14",  // Green — PERSONNEL
  User:                     "#00c8a0",  // Olive — USER PROFILE
  SquadStatus:              "#ff3090",  // Pink — SQUAD COLLECTIVE
  SquadVitals:              "#ff2020",  // Red — SQUAD HEALTH STATE
  PlayerLocation:           "#00e8ff",  // Steel — POSITION DATA

  // ── Operations & Missions
  Mission:                  "#ff6a00",  // Orange — ACTIVE MISSION
  ClanPosition:             "#39ff14",  // Green — FIELD POSITION
  ClanBroadcast:            "#ffaa00",  // Amber — BROADCAST
  Announcement:             "#ffaa00",  // Amber — ANNOUNCEMENT
  ClanEvent:                "#b060ff",  // Violet — EVENT
  
  // ── Tactical Map & Overlays
  TacticalOverlay:          "#00e8ff",  // Cyan — MAP OVERLAY
  TacticalMapOverlay:       "#00e8ff",  // Cyan — TACTICAL ELEMENT
  MapPin:                   "#e8b800",  // Gold — MARKED LOCATION
  HazardZone:               "#ff2020",  // Red — DANGER ZONE
  LootHotspot:              "#e8b800",  // Gold — LOOT LOCATION

  // ── Resources & Logistics
  ResourceListing:          "#00c8a0",  // Teal — RESOURCE AVAILABLE
  TradeOffer:               "#00c8a0",  // Olive — TRADE PROPOSAL
  ResourceConsumption:      "#ff6a00",  // Orange — BURN RATE
  ConsumptionForecast:      "#ffaa00",  // Amber — DEPLETION FORECAST
  SupplyCacheLocation:      "#00e8ff",  // Steel — CACHE LOCATION
  SupplyConvoy:             "#39ff14",  // Green — LOGISTICS MOVING
  ClanStorage:              "#00c8a0",  // Teal — STORAGE FACILITY
  TreasuryEntry:            "#e8b800",  // Gold — FINANCIAL

  // ── Equipment & Durability
  GearDurability:           "#ff6a00",  // Orange — CONDITION STATUS
  Loadout:                  "#00e8ff",  // Steel — EQUIPMENT SET
  LoadoutProfile:           "#00e8ff",  // Steel — LOADOUT TEMPLATE
  InventoryItem:            "#00c8a0",  // Olive — INVENTORY

  // ── Analytics & Intelligence
  IntelSummary:             "#00c8a0",  // Olive — INTELLIGENCE
  ClanAnalytics:            "#b060ff",  // Violet — DATA ANALYSIS
  ServerPerformanceLog:     "#00e8ff",  // Cyan — SYSTEM METRICS
  ActivityLog:              "#00e8ff",  // Steel — ACTIVITY TRAIL
  DeathLesson:              "#ff2020",  // Red — DEATH/FAILURE
  DeathMark:                "#ff2020",  // Red — DEATH LOCATION

  // ── Loot & Finds
  LootFind:                 "#e8b800",  // Gold — LOOT DISCOVERY
  LootRequest:              "#00c8a0",  // Olive — SUPPLY REQUEST
  LootSharing:              "#39ff14",  // Green — LOOT DISTRIBUTION

  // ── Governance & Community
  ClanVote:                 "#b060ff",  // Violet — VOTING/CONSENSUS
  Challenge:                "#ff6a00",  // Orange — CHALLENGE
  PlayerVouch:              "#39ff14",  // Green — ENDORSEMENT
  WikiArticle:              "#00e8ff",  // Steel — KNOWLEDGE
  ClanMessage:              "#ffaa00",  // Amber — COMMUNICATION

  // ── Automation & Admin
  RconPreset:               "#00e8ff",  // Cyan — COMMAND PRESET
  ScheduledCommand:         "#ffaa00",  // Amber — SCHEDULED ACTION
  RconHistory:              "#00e8ff",  // Steel — COMMAND LOG
  ServerEvent:              "#ff6a00",  // Orange — SERVER EVENT
  AlertRule:                "#ff2020",  // Red — ALERT CONDITION
  AlertHistory:             "#ff6a00",  // Orange — ALERT FIRED

  // ── User Preferences
  NotificationPreference:   "#ffaa00",  // Amber — NOTIFICATION CONFIG
  UserWidgetConfig:         "#00e8ff",  // Steel — UI CONFIGURATION
};

// ═══════════════════════════════════════════════════════════════════════════
// STATUS COLOR MAPPING — Context-independent state indication
// ═══════════════════════════════════════════════════════════════════════════

export const STATUS_COLORS = {
  // ── Universal operational states
  active:           "#39ff14",  // Green
  standby:          "#ffaa00",  // Amber
  inactive:         "#4a4a4a",  // Dark gray
  offline:          "#ff2020",  // Red
  online:           "#39ff14",  // Green
  idle:             "#ffaa00",  // Amber
  busy:             "#ff6a00",  // Orange

  // ── Completion/workflow states
  pending:          "#ffaa00",  // Amber
  in_progress:      "#00e8ff",  // Cyan
  completed:        "#39ff14",  // Green
  cancelled:        "#a79b8f",  // Rust gray
  failed:           "#ff2020",  // Red
  archived:         "#4a4a4a",  // Dark gray

  // ── Health/Vitals states
  healthy:          "#39ff14",  // Green
  caution:          "#ffaa00",  // Amber
  critical:         "#ff2020",  // Red
  incapacitated:    "#8a0000",  // Dark red
  downed:           "#ff2020",  // Red
  injured:          "#ff6a00",  // Orange

  // ── Resource availability
  available:        "#39ff14",  // Green
  low:              "#ffaa00",  // Amber
  depleted:         "#ff2020",  // Red
  unavailable:      "#4a4a4a",  // Gray

  // ── Loot/Trade states
  fresh:            "#39ff14",  // Green
  looted:           "#4a4a4a",  // Gray
  cleared:          "#4a4a4a",  // Gray
  unknown:          "#ffaa00",  // Amber

  // ── Trade/Offer states
  open:             "#ffaa00",  // Amber
  pending_trade:    "#ffaa00",  // Amber
  accepted:         "#39ff14",  // Green
  rejected:         "#ff2020",  // Red
  cancelled_trade:  "#4a4a4a",  // Gray

  // ── Mission states
  standby_mission:  "#ffaa00",  // Amber
  returning:        "#00e8ff",  // Cyan
  compromised:      "#ff2020",  // Red

  // ── Hazard severity
  low_hazard:       "#39ff14",  // Green
  medium:           "#ffaa00",  // Amber
  high:             "#ff6a00",  // Orange
  critical_hazard:  "#ff2020",  // Red

  // ── Morale
  excellent:        "#39ff14",  // Green
  good:             "#00c8a0",  // Olive
  fair:             "#ffaa00",  // Amber
  critical_morale:  "#ff2020",  // Red

  // ── Visibility
  public:           "#39ff14",  // Green
  squad_only:       "#ffaa00",  // Amber
  leadership_only:  "#ff2020",  // Red
  private:          "#4a4a4a",  // Gray
};

// ═══════════════════════════════════════════════════════════════════════════
// ROLE-BASED COLORS — Authority & permission levels
// ═══════════════════════════════════════════════════════════════════════════

export const ROLE_COLORS = {
  admin:            "#ff2020",  // Red — HIGH AUTHORITY
  system_admin:     "#ff6a00",  // Orange — SYSTEM LEVEL
  leader:           "#ffaa00",  // Amber — LEADERSHIP
  squad_lead:       "#ffaa00",  // Amber — SQUAD AUTHORITY
  member:           "#39ff14",  // Green — REGULAR MEMBER
  guest:            "#4a4a4a",  // Gray — LIMITED ACCESS
  bot:              "#00c8a0",  // Olive — AUTOMATED
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-SPECIFIC PALETTES — Page/section color schemes
// ═══════════════════════════════════════════════════════════════════════════

export const PAGE_PALETTES = {
  // ServerMonitor: Red (critical systems), Cyan (data), Green (operational)
  ServerMonitor: {
    primary:    "#ff2020",  // Red for critical alerts
    secondary:  "#00e8ff",  // Cyan for metrics
    accent:     "#39ff14",  // Green for operational
    warning:    "#ff6a00",  // Orange for warnings
  },

  // ClanMap: Green (positions), Cyan (intel), Gold (objectives)
  ClanMap: {
    primary:    "#39ff14",  // Green for friendly
    secondary:  "#ff2020",  // Red for threats
    accent:     "#e8b800",  // Gold for objectives
    intel:      "#00e8ff",  // Cyan for broadcasts
  },

  // ResourceTradingHub: Teal (resources), Olive (trades), Gold (loot)
  ResourceTradingHub: {
    primary:    "#00c8a0",  // Teal for resources
    secondary:  "#00c8a0",  // Olive for trades
    accent:     "#e8b800",  // Gold for loot
    available:  "#39ff14",  // Green for available
  },

  // SupplyChainManager: Orange (consumption), Amber (forecast), Green (supply)
  SupplyChainManager: {
    primary:    "#ff6a00",  // Orange for consumption
    secondary:  "#ffaa00",  // Amber for forecast
    accent:     "#39ff14",  // Green for supply
    warning:    "#ff2020",  // Red for depleted
  },

  // Dashboard: Amber (standby), Green (active), Violet (analytics)
  Dashboard: {
    primary:    "#ffaa00",  // Amber for status
    secondary:  "#39ff14",  // Green for active
    accent:     "#b060ff",  // Violet for analytics
    info:       "#00e8ff",  // Cyan for info
  },

  // SurvivalPlanner: Orange (hazards), Gold (loot), Steel (routes)
  SurvivalPlanner: {
    primary:    "#ff6a00",  // Orange for hazards
    secondary:  "#e8b800",  // Gold for loot
    accent:     "#00e8ff",  // Steel for routes
    safe:       "#39ff14",  // Green for clear
  },

  // Intel: Olive (intelligence), Violet (analysis), Cyan (data)
  Intel: {
    primary:    "#00c8a0",  // Olive for intel
    secondary:  "#b060ff",  // Violet for analysis
    accent:     "#00e8ff",  // Cyan for data
    critical:   "#ff2020",  // Red for alerts
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get color for an entity type
 * @param {string} entityName - Entity type name (e.g., "ResourceListing")
 * @returns {string} - Hex color code
 */
export function getEntityColor(entityName) {
  return ENTITY_COLORS[entityName] || CORE.info;
}

/**
 * Get color for a status value
 * @param {string} status - Status value (e.g., "active", "pending")
 * @returns {string} - Hex color code
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || CORE.info;
}

/**
 * Get color for a user role
 * @param {string} role - Role name (e.g., "admin", "member")
 * @returns {string} - Hex color code
 */
export function getRoleColor(role) {
  return ROLE_COLORS[role] || CORE.info;
}

/**
 * Get page-specific palette
 * @param {string} pageName - Page name (e.g., "ServerMonitor")
 * @returns {object} - Color palette for the page
 */
export function getPagePalette(pageName) {
  return PAGE_PALETTES[pageName] || PAGE_PALETTES.Dashboard;
}

/**
 * Create a glow effect string for a color
 * @param {string} color - Hex color code
 * @param {number} intensity - Glow intensity (default: 1)
 * @returns {string} - Text shadow glow
 */
export function getColorGlow(color, intensity = 1) {
  return `0 0 ${10 * intensity}px ${color}, 0 0 ${20 * intensity}px ${color}44`;
}

/**
 * Create a border glow effect for a color
 * @param {string} color - Hex color code
 * @param {number} intensity - Glow intensity (default: 1)
 * @returns {string} - Box shadow effect
 */
export function getColorBorderGlow(color, intensity = 1) {
  return `0 0 ${8 * intensity}px ${color}${Math.round(0x44 * intensity).toString(16)}`;
}

/**
 * Create a background with semi-transparent color
 * @param {string} color - Hex color code
 * @param {number} alpha - Alpha value 0-1 (default: 0.1)
 * @returns {string} - Background color with transparency
 */
export function getColorBackground(color, alpha = 0.1) {
  return `${color}${Math.round(255 * alpha).toString(16).padStart(2, '0')}`;
}

export default {
  CORE,
  ENTITY_COLORS,
  STATUS_COLORS,
  ROLE_COLORS,
  PAGE_PALETTES,
  getEntityColor,
  getStatusColor,
  getRoleColor,
  getPagePalette,
  getColorGlow,
  getColorBorderGlow,
  getColorBackground,
};


