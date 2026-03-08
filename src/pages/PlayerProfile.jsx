import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, ArrowLeft, ThumbsUp } from "lucide-react";
import { T, PageHeader, Panel, StatGrid, EmptyState, ActionBtn } from "@/components/ui/TerminalCard";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import LiveStatusStrip from "@/components/live/LiveStatusStrip";
import PresenceConsole from "@/components/features/profile/PresenceConsole";
import SkillForge from "@/components/features/profile/SkillForge";
import FieldJournal from "@/components/features/profile/FieldJournal";

const ROLE_COLORS = {
  Commander: T.orange,
  Lieutenant: T.amber,
  Scout: T.cyan,
  Engineer: T.green,
  Medic: "#ff5555",
  Grunt: T.textDim,
};
const STATUS_COLORS = { Active: T.green, Inactive: T.textDim, MIA: T.amber, KIA: T.red };
const ACT_COLORS = {
  mission_completed: T.green,
  kill: T.red,
  death: T.amber,
  loot_found: T.cyan,
  resource_gathered: T.orange,
  player_joined: T.green,
  player_left: T.textDim,
};
const ACT_ICONS = {
  mission_completed: "⚑",
  kill: "☠",
  death: "†",
  loot_found: "◆",
  resource_gathered: "◉",
  player_joined: "▶",
  player_left: "◀",
};
const ACT_LABELS = {
  mission_completed: "MISSION COMPLETED",
  kill: "KILL",
  death: "DEATH",
  loot_found: "LOOT FOUND",
  resource_gathered: "RESOURCES GATHERED",
  player_joined: "JOINED SERVER",
  player_left: "LEFT SERVER",
};

const OFFICER_ROLE_TOKENS = new Set(["commander", "lieutenant", "officer"]);

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";

const normalizeRole = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const safeList = async (entityName, sort = "-created_date", limit = 300) => {
  const entity = base44?.entities?.[entityName];
  if (!entity?.list) return [];
  try {
    const rows = await entity.list(sort, limit);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const safeFilter = async (entityName, where, sort = "-created_date", limit = 100) => {
  const entity = base44?.entities?.[entityName];
  if (!entity) return [];
  if (typeof entity.filter === "function") {
    try {
      const rows = await entity.filter(where, sort, limit);
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }
  const rows = await safeList(entityName, sort, limit);
  if (!where || typeof where !== "object") return rows;
  return rows.filter((row) =>
    Object.entries(where).every(([key, value]) => row?.[key] === value),
  );
};

// Derive achievements from stats.
function computeAchievements(member, missions, statuses) {
  const achievements = [];
  const kills = member?.kills || 0;
  const deaths = member?.deaths || 0;
  const kd = deaths > 0 ? kills / deaths : kills;
  const playtime = member?.playtime_hours || 0;
  const completedMissions = statuses.completeMissionStatus
    ? missions.filter((mission) => mission.status === statuses.completeMissionStatus).length
    : 0;

  if (kills >= 100) achievements.push({ label: "CENTURION", desc: "100+ kills", icon: "☠", color: T.red });
  if (kills >= 50) achievements.push({ label: "HUNTER", desc: "50+ kills", icon: "🎯", color: T.orange });
  if (kd >= 3) achievements.push({ label: "APEX PREDATOR", desc: "K/D ratio ≥ 3.0", icon: "⚡", color: T.amber });
  if (kd >= 2) achievements.push({ label: "MARKSMAN", desc: "K/D ratio ≥ 2.0", icon: "◎", color: T.cyan });
  if (playtime >= 100) achievements.push({ label: "VETERAN", desc: "100+ hours played", icon: "★", color: T.amber });
  if (playtime >= 50) achievements.push({ label: "SEASONED", desc: "50+ hours played", icon: "◈", color: T.textDim });
  if (completedMissions >= 10) achievements.push({ label: "MISSION EXPERT", desc: "10+ missions done", icon: "⚑", color: T.green });
  if (completedMissions >= 5) achievements.push({ label: "FIELD OPS", desc: "5+ missions done", icon: "✦", color: T.cyan });
  if (member?.role === "Commander") achievements.push({ label: "COMMANDER", desc: "Clan commander", icon: "◆", color: T.orange });
  if (statuses.activeClanStatus && member?.status === statuses.activeClanStatus && playtime > 0) {
    achievements.push({ label: "ACTIVE DUTY", desc: "Currently active", icon: "●", color: T.green });
  }

  return achievements;
}

export default function PlayerProfile() {
  const runtimeConfig = useRuntimeConfig();
  const missionStatuses = runtimeConfig.getArray(["taxonomy", "mission_statuses"]);
  const clanStatuses = runtimeConfig.getArray(["taxonomy", "clan_statuses"]);
  const completeMissionStatus = pickByToken(missionStatuses, "complete");
  const activeMissionStatus = pickByToken(missionStatuses, "active");
  const pendingMissionStatus = pickByToken(missionStatuses, "pending");
  const activeClanStatus = pickByToken(clanStatuses, "active");

  const memberId = useMemo(() => new URLSearchParams(window.location.search).get("id"), []);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [vouchForm, setVouchForm] = useState({ comment: "", rating: 5 });
  const [showVouchForm, setShowVouchForm] = useState(false);
  const [vouchBusy, setVouchBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    base44.auth.me()
      .then((resolved) => setUser(resolved || null))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const membersQuery = useRealtimeEntityList({
    queryKey: ["player-profile", "members"],
    entityName: "ClanMember",
    queryFn: () => safeList("ClanMember", "-created_date", 500),
    staleAfterMs: 30_000,
    patchStrategy: "patch",
  });
  const missionsQuery = useRealtimeEntityList({
    queryKey: ["player-profile", "missions"],
    entityName: "Mission",
    queryFn: () => safeList("Mission", "-created_date", 300),
    staleAfterMs: 30_000,
    patchStrategy: "patch",
  });
  const activityQuery = useRealtimeEntityList({
    queryKey: ["player-profile", "activity", memberId || "none"],
    entityName: "ActivityLog",
    queryFn: () => safeFilter("ActivityLog", { clan_member_id: memberId }, "-timestamp", 120),
    enabled: Boolean(memberId),
    staleAfterMs: 30_000,
    patchStrategy: "patch",
  });

  const members = Array.isArray(membersQuery.data) ? membersQuery.data : [];
  const allMissions = Array.isArray(missionsQuery.data) ? missionsQuery.data : [];
  const activity = Array.isArray(activityQuery.data) ? activityQuery.data : [];

  const member = useMemo(
    () => members.find((entry) => entry.id === memberId) || null,
    [memberId, members],
  );

  const vouchesQuery = useRealtimeEntityList({
    queryKey: ["player-profile", "vouches", member?.user_email || "none"],
    entityName: "PlayerVouch",
    queryFn: () => safeFilter("PlayerVouch", { target_email: member?.user_email || "" }, "-created_date", 100),
    enabled: Boolean(member?.user_email),
    staleAfterMs: 30_000,
    patchStrategy: "patch",
  });
  const vouches = Array.isArray(vouchesQuery.data) ? vouchesQuery.data : [];

  const myMember = useMemo(
    () => members.find((entry) => entry.user_email && entry.user_email === user?.email) || null,
    [members, user?.email],
  );
  const myCallsign = myMember?.callsign || user?.full_name || user?.email || "Operator";
  const viewerRoleToken = normalizeRole(myMember?.role);

  const isAdmin = user?.role === "admin";
  const isOwnProfile = Boolean(user?.email && member?.user_email && user.email === member.user_email);
  const canEditProfile = Boolean(isAdmin || isOwnProfile);
  const canViewOfficerNotes = Boolean(isAdmin || OFFICER_ROLE_TOKENS.has(viewerRoleToken));

  const missions = useMemo(() => {
    if (!member?.callsign) return [];
    return allMissions.filter((mission) =>
      Array.isArray(mission.assigned_to) && mission.assigned_to.includes(member.callsign),
    );
  }, [allMissions, member?.callsign]);

  const activeMissionStatuses = [activeMissionStatus, pendingMissionStatus].filter(Boolean);
  const activeMissions = useMemo(
    () => (activeMissionStatuses.length
      ? missions.filter((mission) => activeMissionStatuses.includes(mission.status))
      : []),
    [activeMissionStatuses, missions],
  );
  const completedMissions = useMemo(
    () => (completeMissionStatus
      ? missions.filter((mission) => mission.status === completeMissionStatus)
      : []),
    [completeMissionStatus, missions],
  );
  const achievements = useMemo(
    () => computeAchievements(member, missions, { completeMissionStatus, activeClanStatus }),
    [activeClanStatus, completeMissionStatus, member, missions],
  );

  const hasVouched = vouches.some((entry) => entry.voucher_email === user?.email);

  const handleVouch = async () => {
    if (!user?.email || !member?.user_email || hasVouched || user.email === member.user_email || vouchBusy) return;
    setVouchBusy(true);
    setLocalError("");
    try {
      const entity = base44?.entities?.PlayerVouch;
      if (!entity?.create) throw new Error("PlayerVouch entity unavailable.");
      await entity.create({
        voucher_email: user.email,
        voucher_callsign: myCallsign,
        target_email: member.user_email,
        target_callsign: member.callsign,
        comment: vouchForm.comment,
        rating: Number(vouchForm.rating) || 5,
      });
      setShowVouchForm(false);
      setVouchForm({ comment: "", rating: 5 });
      await vouchesQuery.refetch?.();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to submit vouch.");
    } finally {
      setVouchBusy(false);
    }
  };

  const liveInputs = [
    { enabled: true, query: membersQuery },
    { enabled: true, query: missionsQuery },
    { enabled: Boolean(memberId), query: activityQuery },
    { enabled: Boolean(member?.user_email), query: vouchesQuery },
  ];
  const activeLiveQueries = liveInputs.filter((entry) => entry.enabled).map((entry) => entry.query);
  const hasUnavailable = activeLiveQueries.some((query) => query.source === "unavailable");
  const hasStale = activeLiveQueries.some((query) => query.stale);
  const profileSource = hasUnavailable ? "unavailable" : (hasStale ? "fallback" : "live");
  const profileRetrievedAt = activeLiveQueries
    .map((query) => query.retrievedAt)
    .find((value) => typeof value === "string") || null;

  const roleColor = ROLE_COLORS[member?.role] || T.textDim;
  const loading = authLoading || membersQuery.isLoading || membersQuery.isFetching;

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <span className="text-xs cursor-blink" style={{ color: T.textDim }}>LOADING DOSSIER</span>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <Link to={createPageUrl("ClanRoster")} className="flex items-center gap-2 text-xs hover:opacity-70 transition-opacity" style={{ color: T.textDim, textDecoration: "none" }}>
          <ArrowLeft size={11} /> BACK TO ROSTER
        </Link>
        <div className="border px-3 py-8 text-xs text-center" style={{ borderColor: T.border, color: T.textFaint }}>
          // OPERATOR NOT FOUND
        </div>
      </div>
    );
  }

  const kd = member.deaths > 0 ? (member.kills / member.deaths).toFixed(2) : (member.kills || 0);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <Link to={createPageUrl("ClanRoster")} className="flex items-center gap-2 text-xs hover:opacity-70 transition-opacity" style={{ color: T.textDim, textDecoration: "none" }}>
        <ArrowLeft size={11} /> BACK TO ROSTER
      </Link>

      <PageHeader icon={Shield} title={`DOSSIER // ${member.callsign}`} color={roleColor} />
      <LiveStatusStrip
        label="DOSSIER LIVE FEED"
        source={profileSource}
        retrievedAt={profileRetrievedAt}
        staleAfterMs={30_000}
        loading={activeLiveQueries.some((query) => query.isFetching || query.retrying) || vouchBusy}
        error={localError || membersQuery.error?.message || missionsQuery.error?.message || activityQuery.error?.message || vouchesQuery.error?.message || null}
        onRetry={() => Promise.all([membersQuery.refetch?.(), missionsQuery.refetch?.(), activityQuery.refetch?.(), vouchesQuery.refetch?.()])}
        extraBadges={[
          { label: `MISSIONS ${missions.length}`, color: T.cyan },
          { label: `ACTIVITY ${activity.length}`, color: T.amber },
          { label: `VOUCHES ${vouches.length}`, color: T.green },
        ]}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border p-4" style={{ borderColor: roleColor + "55", background: T.bg1 }}>
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-16 h-16 border flex items-center justify-center flex-shrink-0" style={{ borderColor: roleColor, background: roleColor + "11" }}>
            <span style={{ fontSize: "28px", color: roleColor }}>
              {member.role === "Commander" ? "◆" : member.role === "Scout" ? "◎" : member.role === "Medic" ? "✚" : "▣"}
            </span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-bold tracking-widest" style={{ color: roleColor, fontFamily: "'Orbitron', monospace", fontSize: "16px" }}>
              {member.callsign}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs px-2 py-0.5 border" style={{ borderColor: roleColor + "66", color: roleColor, fontSize: "9px" }}>{member.role?.toUpperCase()}</span>
              <span className="text-xs px-2 py-0.5 border flex items-center gap-1" style={{ borderColor: (STATUS_COLORS[member.status] || T.textDim) + "66", color: STATUS_COLORS[member.status] || T.textDim, fontSize: "9px" }}>
                <span style={{ fontSize: "6px" }}>●</span>{member.status?.toUpperCase()}
              </span>
              {member.steam_id && <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>STEAM: {member.steam_id}</span>}
            </div>
            {member.notes && <p className="text-xs mt-2" style={{ color: T.textDim }}>{member.notes}</p>}
            <div className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>
              ENLISTED: {new Date(member.created_date).toLocaleDateString()}
            </div>
          </div>
        </div>
      </motion.div>

      <StatGrid stats={[
        { label: "KILLS", value: member.kills || 0, color: T.red },
        { label: "DEATHS", value: member.deaths || 0, color: T.amber },
        { label: "K/D RATIO", value: kd, color: parseFloat(kd) >= 2 ? T.green : parseFloat(kd) >= 1 ? T.amber : T.red },
        { label: "PLAYTIME", value: `${member.playtime_hours || 0}h`, color: T.cyan },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PresenceConsole member={member} user={user} isEditable={canEditProfile} />
        <SkillForge member={member} user={user} isEditable={canEditProfile} />
        <FieldJournal member={member} user={user} myCallsign={myCallsign} isEditable={canEditProfile} canViewOfficerNotes={canViewOfficerNotes} />

        <Panel title="ACHIEVEMENTS" titleColor={T.amber}>
          <div className="p-3">
            {achievements.length === 0
              ? <div className="py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO ACHIEVEMENTS UNLOCKED</div>
              : <div className="grid grid-cols-2 gap-2">
                {achievements.map((ach) => (
                  <div key={ach.label} className="border p-2 flex items-start gap-2" style={{ borderColor: ach.color + "44", background: ach.color + "0a" }}>
                    <span style={{ fontSize: "14px", lineHeight: 1, flexShrink: 0 }}>{ach.icon}</span>
                    <div>
                      <div className="font-bold" style={{ color: ach.color, fontFamily: "'Orbitron', monospace", fontSize: "8px", letterSpacing: "0.1em" }}>{ach.label}</div>
                      <div style={{ color: T.textFaint, fontSize: "9px" }}>{ach.desc}</div>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        </Panel>

        <Panel title={`ACTIVE ASSIGNMENTS (${activeMissions.length})`} titleColor={T.green}>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {activeMissions.length === 0
              ? <EmptyState message="NO ACTIVE ASSIGNMENTS" />
              : activeMissions.map((mission) => (
                <div key={mission.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                  <span style={{ color: mission.status === activeMissionStatus ? T.green : T.amber, fontSize: "7px" }}>●</span>
                  <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{mission.title}</span>
                  <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>{mission.priority}</span>
                </div>
              ))}
          </div>
        </Panel>

        <Panel title={`COMPLETED MISSIONS (${completedMissions.length})`} titleColor={T.cyan}>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {completedMissions.length === 0
              ? <EmptyState message="NO COMPLETED MISSIONS" />
              : completedMissions.map((mission) => (
                <div key={mission.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                  <span style={{ color: T.cyan, fontSize: "9px" }}>⚑</span>
                  <span className="text-xs flex-1 truncate" style={{ color: T.textDim }}>{mission.title}</span>
                  {mission.deadline && <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>{new Date(mission.deadline).toLocaleDateString()}</span>}
                </div>
              ))}
          </div>
        </Panel>

        <Panel title="ACTIVITY LOG" titleColor={T.textDim}>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {activity.length === 0
              ? <EmptyState message="NO ACTIVITY RECORDED" />
              : activity.map((log) => (
                <div key={log.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                  <span style={{ color: ACT_COLORS[log.activity_type] || T.textDim, fontSize: "10px" }}>{ACT_ICONS[log.activity_type] || "●"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs" style={{ color: ACT_COLORS[log.activity_type] || T.textDim, fontSize: "9px", letterSpacing: "0.08em" }}>
                      {ACT_LABELS[log.activity_type] || log.activity_type}
                    </div>
                    {log.details && <div className="text-xs truncate" style={{ color: T.textFaint, fontSize: "9px" }}>{log.details}</div>}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: T.textFaint, fontSize: "8px" }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
          </div>
        </Panel>
      </div>

      {member.user_email && (
        <Panel title={`VOUCHES (${vouches.length})`} titleColor={T.green} headerRight={
          user && user.email !== member.user_email && !hasVouched
            ? (
              <ActionBtn small color={T.green} onClick={() => setShowVouchForm((value) => !value)}>
                <ThumbsUp size={9} /> VOUCH
              </ActionBtn>
            )
            : null
        }>
          {showVouchForm && (
            <div className="px-3 py-3 border-b" style={{ borderColor: T.border }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: 4 }}>RATING (1-5)</div>
                  <input type="number" min="1" max="5" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={vouchForm.rating} onChange={(event) => setVouchForm((prev) => ({ ...prev, rating: event.target.value }))} />
                </div>
                <div>
                  <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: 4 }}>COMMENT</div>
                  <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={vouchForm.comment} onChange={(event) => setVouchForm((prev) => ({ ...prev, comment: event.target.value }))} placeholder="Great teammate..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <ActionBtn small color={T.textDim} onClick={() => setShowVouchForm(false)}>CANCEL</ActionBtn>
                <ActionBtn small color={T.green} onClick={handleVouch} disabled={vouchBusy}>SUBMIT VOUCH</ActionBtn>
              </div>
            </div>
          )}
          {vouches.length === 0
            ? <EmptyState message="NO VOUCHES YET — BE THE FIRST" />
            : vouches.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: "bold", flexShrink: 0 }}>
                  {"★".repeat(entry.rating || 0)}{"☆".repeat(Math.max(0, 5 - (entry.rating || 0)))}
                </div>
                <div className="flex-1 min-w-0">
                  {entry.comment && <div style={{ color: T.text, fontSize: "11px" }}>{entry.comment}</div>}
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>by {entry.voucher_callsign || entry.voucher_email} · {entry.created_date?.slice(0, 10)}</div>
                </div>
              </div>
            ))}
        </Panel>
      )}
    </div>
  );
}
