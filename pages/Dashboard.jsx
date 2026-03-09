import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Terminal, Package, Activity, Skull, Wrench, Zap } from "lucide-react";
import { T, PageHeader, Panel, StatGrid } from "@/components/ui/TerminalCard";
import { RadioRack } from "@/components/voice/RadioRack";
import { TrafficLogPanel } from "@/components/voice/TrafficLogPanel";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { CORE, ENTITY_COLORS, PAGE_PALETTES } from "@/components/ColorSystem";


const PAGE = PAGE_PALETTES.Dashboard;
const SEV_COLORS = { INFO: T.textDim, WARN: CORE.warning, ALERT: CORE.warning, CRITICAL: CORE.critical };
const ANN_COLORS = { Emergency: CORE.critical, Intel: CORE.info, Ops: CORE.warning, General: CORE.operational, Maintenance: CORE.standby };
const SNAPSHOT_PALETTE = [ENTITY_COLORS.InventoryItem || CORE.info, ENTITY_COLORS.ResourceListing || CORE.operational, ENTITY_COLORS.SupplyCacheLocation || CORE.info, ENTITY_COLORS.TradeOffer || CORE.olive];

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";

export default function Dashboard() {
  const runtimeConfig = useRuntimeConfig();
  const missionStatuses = runtimeConfig.getArray(["taxonomy", "mission_statuses"]);
  const clanStatuses = runtimeConfig.getArray(["taxonomy", "clan_statuses"]);
  const inventoryCategories = runtimeConfig.getArray(["taxonomy", "inventory_categories"]);

  const missionStatusColors = useMemo(() => {
    const palette = [T.amber, T.green, T.cyan, T.red, T.textDim, T.orange];
    return Object.fromEntries(missionStatuses.map((status, index) => [status, palette[index % palette.length]]));
  }, [missionStatuses]);

  const activeMissionStatus = useMemo(() => pickByToken(missionStatuses, "active"), [missionStatuses]);
  const pendingMissionStatus = useMemo(() => pickByToken(missionStatuses, "pending"), [missionStatuses]);
  const activeMemberStatus = useMemo(() => pickByToken(clanStatuses, "active"), [clanStatuses]);
  const trackedInventoryCategories = useMemo(
    () => inventoryCategories.filter((category) => category.toLowerCase() !== "all").slice(0, 4),
    [inventoryCategories],
  );
  const inventoryCategoryColors = useMemo(
    () => Object.fromEntries(trackedInventoryCategories.map((category, index) => [category, SNAPSHOT_PALETTE[index % SNAPSHOT_PALETTE.length]])),
    [trackedInventoryCategories],
  );

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });
  const { data: members = [] } = useRealtimeEntityList({
    queryKey: ["dashboard", "members"],
    entityName: "ClanMember",
    queryFn: () => base44.entities.ClanMember.list("-created_date", 20),
    patchStrategy: "patch",
  });
  const { data: missions = [] } = useRealtimeEntityList({
    queryKey: ["dashboard", "missions"],
    entityName: "Mission",
    queryFn: () => base44.entities.Mission.list("-created_date", 20),
    patchStrategy: "patch",
  });
  const { data: items = [] } = useRealtimeEntityList({
    queryKey: ["dashboard", "inventory"],
    entityName: "InventoryItem",
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 50),
    patchStrategy: "patch",
  });
  const { data: events = [] } = useRealtimeEntityList({
    queryKey: ["dashboard", "events"],
    entityName: "ServerEvent",
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 10),
    patchStrategy: "patch",
  });
  const { data: announcements = [] } = useRealtimeEntityList({
    queryKey: ["dashboard", "announcements"],
    entityName: "Announcement",
    queryFn: () => base44.entities.Announcement.list("-created_date", 5),
    patchStrategy: "patch",
  });

  const activeMissionStatuses = useMemo(
    () => [activeMissionStatus, pendingMissionStatus].filter(Boolean),
    [activeMissionStatus, pendingMissionStatus],
  );
  const highlightedMissions = useMemo(
    () => missions.filter((mission) => activeMissionStatuses.includes(mission.status)).slice(0, 5),
    [activeMissionStatuses, missions],
  );

  const activeMissions = activeMissionStatus ? missions.filter((mission) => mission.status === activeMissionStatus).length : 0;
  const activeMembers = activeMemberStatus ? members.filter((member) => member.status === activeMemberStatus).length : 0;
  const criticalEvents = events.filter((event) => event.severity === "CRITICAL" || event.severity === "ALERT").length;
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const categoryTotals = useMemo(() => {
    const totals = Object.fromEntries(
      trackedInventoryCategories.map((category) => [
        category,
        items.filter((item) => item.category === category).reduce((sum, item) => sum + (item.quantity || 1), 0),
      ]),
    );
    const max = Math.max(1, ...Object.values(totals));
    return { totals, max };
  }, [items, trackedInventoryCategories]);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <PageHeader icon={Terminal} title="COMMAND HQ" color={PAGE.primary}>
        <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.15em" }}>
          {user ? `OPERATOR: ${user.full_name || user.email}` : "AUTHENTICATING..."}
        </span>
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      <StatGrid
        stats={[
          { label: "ACTIVE OPS", value: activeMissions, color: PAGE.secondary },
          { label: "OPERATORS ONLINE", value: activeMembers, color: PAGE.accent },
          { label: "ALERTS", value: criticalEvents, color: criticalEvents > 0 ? CORE.critical : T.textDim },
          { label: "TOTAL INVENTORY", value: totalItems, color: PAGE.info },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Panel
            title="ACTIVE MISSIONS"
            titleColor={ENTITY_COLORS.Mission}
            headerRight={
              <Link to={createPageUrl("Missions")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em", textDecoration: "none" }}>
                VIEW ALL →
              </Link>
            }
          >
            <div>
              {highlightedMissions.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>
                  // NO ACTIVE MISSIONS
                </div>
              ) : (
                highlightedMissions.map((mission, index) => (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 px-3 py-2 border-b"
                    style={{ borderColor: T.border + "55" }}
                  >
                    <span style={{ color: missionStatusColors[mission.status] || T.textDim, fontSize: "7px" }}>●</span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.text }}>
                      {mission.title}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 border"
                      style={{
                        borderColor: (missionStatusColors[mission.status] || T.textDim) + "66",
                        color: missionStatusColors[mission.status] || T.textDim,
                        fontSize: "9px",
                      }}
                    >
                      {mission.priority}
                    </span>
<span className="text-xs" style={{ color: missionStatusColors[mission.status] || T.textDim, fontSize: "9px" }}>
                      {mission.status}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            title="SERVER FEED"
            titleColor={ENTITY_COLORS.ServerEvent}
            headerRight={
              <Link to={createPageUrl("ServerMonitor")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
                MONITOR →
              </Link>
            }
          >
            <div>
              {events.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>
                  // NO RECENT EVENTS
                </div>
              ) : (
                events.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                    <span className="text-xs flex-shrink-0 mt-0.5 px-1 border" style={{ color: SEV_COLORS[event.severity] || T.textDim, borderColor: (SEV_COLORS[event.severity] || T.textDim) + "44", fontSize: "8px" }}>
                      {event.severity || "INFO"}
                    </span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.textDim }}>
                      {event.message}
                    </span>
                    {event.player && (
                      <span className="text-xs flex-shrink-0" style={{ color: T.textFaint, fontSize: "9px" }}>
                        {event.player}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            title="LATEST INTEL"
            titleColor={ENTITY_COLORS.IntelSummary}
            headerRight={
              <Link to={createPageUrl("Intel")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
                FULL FEED →
              </Link>
            }
          >
            <div>
              {announcements.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>
                  // NO TRANSMISSIONS
                </div>
              ) : (
                announcements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="px-3 py-2.5 border-b" style={{ borderColor: T.border + "44" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1.5 border" style={{ color: ANN_COLORS[announcement.type] || T.amber, borderColor: (ANN_COLORS[announcement.type] || T.amber) + "55", fontSize: "9px" }}>
                        {announcement.type?.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold truncate" style={{ color: T.text }}>
                        {announcement.title}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: T.textDim }}>
                      {announcement.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="ROSTER STATUS"
            titleColor={ENTITY_COLORS.ClanMember}
            headerRight={
              <Link to={createPageUrl("ClanRoster")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
                FULL ROSTER →
              </Link>
            }
          >
            <div>
              {members.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>
                  // NO OPERATORS
                </div>
              ) : (
                members.slice(0, 8).map((member) => (
                  <div key={member.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                    <span style={{ color: member.status === activeMemberStatus ? T.green : T.textFaint, fontSize: "7px" }}>●</span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.text }}>
                      {member.callsign}
                    </span>
                    <span className="text-xs" style={{ color: T.textDim, fontSize: "9px" }}>
                      {member.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="MODULES">
            <div className="grid grid-cols-2 gap-px" style={{ background: T.border }}>
              {[
                { label: "TACTICAL MAP", page: "TacticalMap", icon: Activity, color: ENTITY_COLORS.TacticalOverlay },
                { label: "INVENTORY", page: "Inventory", icon: Package, color: ENTITY_COLORS.InventoryItem },
                { label: "ENGINEERING", page: "EngineeringOps", icon: Wrench, color: PAGE.secondary },
                { label: "SERVER", page: "ServerMonitor", icon: Zap, color: PAGE.primary },
                { label: "AI AGENT", page: "AIAgent", icon: Skull, color: PAGE.accent },
              ].map(({ label, page, icon: Icon, color }) => (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className="flex flex-col items-center justify-center gap-2 py-4 transition-opacity hover:opacity-80"
                  style={{ background: T.bg1, textDecoration: "none" }}
                >
                  <Icon size={16} style={{ color }} />
                  <span className="text-xs tracking-widest text-center" style={{ color: T.textDim, fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="INVENTORY SNAPSHOT" titleColor={ENTITY_COLORS.InventoryItem}>
            <div className="p-3 space-y-2">
              {trackedInventoryCategories.length === 0 ? (
                <div className="text-xs text-center" style={{ color: T.textFaint }}>
                  // INVENTORY TAXONOMY UNAVAILABLE
                </div>
              ) : (
                trackedInventoryCategories.map((category) => {
                  const count = categoryTotals.totals[category] || 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>
                          {category.toUpperCase()}
                        </span>
                        <span className="text-xs" style={{ color: T.textDim, fontSize: "9px" }}>
                          ×{count}
                        </span>
                      </div>
                      <div className="progress-bar-terminal">
                        <div
                          className="progress-bar-terminal-fill"
                          style={{ width: `${(count / categoryTotals.max) * 100}%`, background: inventoryCategoryColors[category] || T.amber }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <RadioRack />
            </div>
            <div>
              <TrafficLogPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
