import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, ArrowLeft, ThumbsUp } from "lucide-react";
import { T, PageHeader, Panel, StatGrid, EmptyState, ActionBtn } from "@/components/ui/TerminalCard";
import { createPageUrl } from "@/utils";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const ROLE_COLORS   = { Commander: T.orange, Lieutenant: T.amber, Scout: T.cyan, Engineer: T.green, Medic: "#ff5555", Grunt: T.textDim };
const STATUS_COLORS = { Active: T.green, Inactive: T.textDim, MIA: T.amber, KIA: T.red };
const ACT_COLORS    = { mission_completed: T.green, kill: T.red, death: T.amber, loot_found: T.cyan, resource_gathered: T.orange, player_joined: T.green, player_left: T.textDim };
const ACT_ICONS     = { mission_completed: "⚑", kill: "☠", death: "†", loot_found: "◆", resource_gathered: "◉", player_joined: "▶", player_left: "◀" };
const ACT_LABELS    = { mission_completed: "MISSION COMPLETED", kill: "KILL", death: "DEATH", loot_found: "LOOT FOUND", resource_gathered: "RESOURCES GATHERED", player_joined: "JOINED SERVER", player_left: "LEFT SERVER" };
const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";

// Derive achievements from stats
function computeAchievements(member, missions, activityLogs, statuses) {
  const achievements = [];
  const kills = member.kills || 0;
  const deaths = member.deaths || 0;
  const kd = deaths > 0 ? kills / deaths : kills;
  const playtime = member.playtime_hours || 0;
  const completedMissions = statuses.completeMissionStatus
    ? missions.filter((mission) => mission.status === statuses.completeMissionStatus).length
    : 0;

  if (kills >= 100)        achievements.push({ label: "CENTURION",      desc: "100+ kills",           icon: "☠", color: T.red });
  if (kills >= 50)         achievements.push({ label: "HUNTER",         desc: "50+ kills",            icon: "🎯", color: T.orange });
  if (kd >= 3)             achievements.push({ label: "APEX PREDATOR",  desc: "K/D ratio ≥ 3.0",     icon: "⚡", color: T.amber });
  if (kd >= 2)             achievements.push({ label: "MARKSMAN",       desc: "K/D ratio ≥ 2.0",     icon: "◎", color: T.cyan });
  if (playtime >= 100)     achievements.push({ label: "VETERAN",        desc: "100+ hours played",    icon: "★", color: T.amber });
  if (playtime >= 50)      achievements.push({ label: "SEASONED",       desc: "50+ hours played",     icon: "◈", color: T.textDim });
  if (completedMissions >= 10) achievements.push({ label: "MISSION EXPERT", desc: "10+ missions done", icon: "⚑", color: T.green });
  if (completedMissions >= 5)  achievements.push({ label: "FIELD OPS",  desc: "5+ missions done",     icon: "✦", color: T.cyan });
  if (member.role === "Commander") achievements.push({ label: "COMMANDER",  desc: "Clan commander",   icon: "◆", color: T.orange });
  if (statuses.activeClanStatus && member.status === statuses.activeClanStatus && playtime > 0) {
    achievements.push({ label: "ACTIVE DUTY", desc: "Currently active", icon: "●", color: T.green });
  }

  return achievements;
}

export default function PlayerProfile() {
  const params = useParams();
  const runtimeConfig = useRuntimeConfig();
  const missionStatuses = runtimeConfig.getArray(["taxonomy", "mission_statuses"]);
  const clanStatuses = runtimeConfig.getArray(["taxonomy", "clan_statuses"]);
  const completeMissionStatus = pickByToken(missionStatuses, "complete");
  const activeMissionStatus = pickByToken(missionStatuses, "active");
  const pendingMissionStatus = pickByToken(missionStatuses, "pending");
  const activeClanStatus = pickByToken(clanStatuses, "active");

  const searchParams = new URLSearchParams(window.location.search);
  const memberId = params.id || searchParams.get("id");

  const [member,   setMember]   = useState(null);
  const [missions, setMissions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [vouches,  setVouches]  = useState([]);
  const [user,     setUser]     = useState(null);
  const [vouchForm, setVouchForm] = useState({ comment: "", rating: 5 });
  const [showVouchForm, setShowVouchForm] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!memberId) return;
    Promise.all([
      base44.entities.ClanMember.list("-created_date"),
      base44.entities.Mission.list("-created_date"),
      base44.entities.ActivityLog.filter({ clan_member_id: memberId }, "-timestamp", 50),
      base44.entities.PlayerVouch.filter({ target_email: "" }, "-created_date", 50),
      base44.auth.me(),
    ]).then(([members, allMissions, logs, allVouches, u]) => {
      const m = members.find(x => x.id === memberId);
      setMember(m || null);
      setUser(u);
      const m2 = m ? allMissions.filter(mis =>
        Array.isArray(mis.assigned_to) && mis.assigned_to.includes(m.callsign)
      ) : [];
      setMissions(m2);
      setActivity(logs);
      // Load vouches for this member's email
      if (m?.user_email) {
        base44.entities.PlayerVouch.filter({ target_email: m.user_email }, "-created_date").then(setVouches);
      }
    }).finally(() => setLoading(false));
  }, [memberId]);

  const handleVouch = async () => {
    const myMemberData = await base44.entities.ClanMember.filter({ user_email: user.email });
    const myCallsign = myMemberData[0]?.callsign || user.full_name || user.email;
    const created = await base44.entities.PlayerVouch.create({
      voucher_email: user.email,
      voucher_callsign: myCallsign,
      target_email: member.user_email,
      target_callsign: member.callsign,
      comment: vouchForm.comment,
      rating: Number(vouchForm.rating)
    });
    setVouches(prev => [created, ...prev]);
    setShowVouchForm(false);
    setVouchForm({ comment: "", rating: 5 });
  };

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

  const roleColor = ROLE_COLORS[member.role] || T.textDim;
  const kd = member.deaths > 0 ? (member.kills / member.deaths).toFixed(2) : (member.kills || 0);
  const completedMissions = completeMissionStatus
    ? missions.filter((mission) => mission.status === completeMissionStatus)
    : [];
  const activeMissionStatuses = [activeMissionStatus, pendingMissionStatus].filter(Boolean);
  const activeMissions = activeMissionStatuses.length > 0
    ? missions.filter((mission) => activeMissionStatuses.includes(mission.status))
    : [];
  const achievements = computeAchievements(member, missions, activity, { completeMissionStatus, activeClanStatus });

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Back nav */}
      <Link to={createPageUrl("ClanRoster")} className="flex items-center gap-2 text-xs hover:opacity-70 transition-opacity" style={{ color: T.textDim, textDecoration: "none" }}>
        <ArrowLeft size={11} /> BACK TO ROSTER
      </Link>

      {/* Header */}
      <PageHeader icon={Shield} title={`DOSSIER // ${member.callsign}`} color={roleColor} />

      {/* Identity block */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="border p-4" style={{ borderColor: roleColor + "55", background: T.bg1 }}>
        <div className="flex flex-wrap items-start gap-6">
          {/* Avatar placeholder */}
          <div className="w-16 h-16 border flex items-center justify-center flex-shrink-0"
            style={{ borderColor: roleColor, background: roleColor + "11" }}>
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
              <span className="text-xs px-2 py-0.5 border flex items-center gap-1"
                style={{ borderColor: STATUS_COLORS[member.status] + "66", color: STATUS_COLORS[member.status], fontSize: "9px" }}>
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

      {/* Combat stats */}
      <StatGrid stats={[
        { label: "KILLS",     value: member.kills  || 0,  color: T.red },
        { label: "DEATHS",    value: member.deaths || 0,  color: T.amber },
        { label: "K/D RATIO", value: kd,                  color: parseFloat(kd) >= 2 ? T.green : parseFloat(kd) >= 1 ? T.amber : T.red },
        { label: "PLAYTIME",  value: `${member.playtime_hours || 0}h`, color: T.cyan },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Achievements */}
        <Panel title="ACHIEVEMENTS" titleColor={T.amber}>
          <div className="p-3">
            {achievements.length === 0
              ? <div className="py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO ACHIEVEMENTS UNLOCKED</div>
              : <div className="grid grid-cols-2 gap-2">
                  {achievements.map((ach, i) => (
                    <motion.div key={ach.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className="border p-2 flex items-start gap-2"
                      style={{ borderColor: ach.color + "44", background: ach.color + "0a" }}>
                      <span style={{ fontSize: "14px", lineHeight: 1, flexShrink: 0 }}>{ach.icon}</span>
                      <div>
                        <div className="font-bold" style={{ color: ach.color, fontFamily: "'Orbitron', monospace", fontSize: "8px", letterSpacing: "0.1em" }}>{ach.label}</div>
                        <div style={{ color: T.textFaint, fontSize: "9px" }}>{ach.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
            }
          </div>
        </Panel>

        {/* Active / Pending missions */}
        <Panel title="ACTIVE ASSIGNMENTS" titleColor={T.green}>
          <div>
            {activeMissions.length === 0
              ? <EmptyState message="NO ACTIVE ASSIGNMENTS" />
              : activeMissions.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                  <span style={{ color: m.status === activeMissionStatus ? T.green : T.amber, fontSize: "7px" }}>●</span>
                  <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{m.title}</span>
                  <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>{m.priority}</span>
                </div>
              ))
            }
          </div>
        </Panel>

        {/* Completed missions */}
        <Panel title={`COMPLETED MISSIONS (${completedMissions.length})`} titleColor={T.cyan}>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {completedMissions.length === 0
              ? <EmptyState message="NO COMPLETED MISSIONS" />
              : completedMissions.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                  <span style={{ color: T.cyan, fontSize: "9px" }}>⚑</span>
                  <span className="text-xs flex-1 truncate" style={{ color: T.textDim }}>{m.title}</span>
                  {m.deadline && <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>{new Date(m.deadline).toLocaleDateString()}</span>}
                </div>
              ))
            }
          </div>
        </Panel>

        {/* Activity log */}
        <Panel title="ACTIVITY LOG" titleColor={T.textDim}>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {activity.length === 0
              ? <EmptyState message="NO ACTIVITY RECORDED" />
              : activity.map(log => (
                <div key={log.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                  <span style={{ color: ACT_COLORS[log.activity_type] || T.textDim, fontSize: "10px" }}>
                    {ACT_ICONS[log.activity_type] || "●"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs" style={{ color: ACT_COLORS[log.activity_type] || T.textDim, fontSize: "9px", letterSpacing: "0.08em" }}>
                      {ACT_LABELS[log.activity_type] || log.activity_type}
                    </div>
                    {log.details && <div className="text-xs truncate" style={{ color: T.textFaint, fontSize: "9px" }}>{log.details}</div>}
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: T.textFaint, fontSize: "8px" }}>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            }
          </div>
        </Panel>
      </div>

      {/* Vouches */}
      {member.user_email && (
        <Panel title={`VOUCHES (${vouches.length})`} titleColor={T.green}
          headerRight={
            user && user.email !== member.user_email && !vouches.find(v => v.voucher_email === user.email) ? (
              <ActionBtn small color={T.green} onClick={() => setShowVouchForm(!showVouchForm)}>
                <ThumbsUp size={9} /> VOUCH
              </ActionBtn>
            ) : null
          }>
          {showVouchForm && (
            <div className="px-3 py-3 border-b" style={{ borderColor: T.border }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: 4 }}>RATING (1-5)</div>
                  <input type="number" min="1" max="5" className="w-full border p-2 text-xs"
                    style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                    value={vouchForm.rating} onChange={e => setVouchForm({...vouchForm, rating: e.target.value})} />
                </div>
                <div>
                  <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: 4 }}>COMMENT</div>
                  <input className="w-full border p-2 text-xs"
                    style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                    value={vouchForm.comment} onChange={e => setVouchForm({...vouchForm, comment: e.target.value})}
                    placeholder="Great teammate..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <ActionBtn small color={T.textDim} onClick={() => setShowVouchForm(false)}>CANCEL</ActionBtn>
                <ActionBtn small color={T.green} onClick={handleVouch}>SUBMIT VOUCH</ActionBtn>
              </div>
            </div>
          )}
          {vouches.length === 0 ? <EmptyState message="NO VOUCHES YET — BE THE FIRST" /> :
            vouches.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: "bold", flexShrink: 0 }}>
                  {"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)}
                </div>
                <div className="flex-1 min-w-0">
                  {v.comment && <div style={{ color: T.text, fontSize: "11px" }}>{v.comment}</div>}
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>by {v.voucher_callsign || v.voucher_email} · {v.created_date?.slice(0,10)}</div>
                </div>
              </div>
            ))
          }
        </Panel>
      )}
    </div>
  );
}
