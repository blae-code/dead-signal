import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, ArrowLeft, Crosshair, Activity, Clock, Skull, Target, Star, Zap } from "lucide-react";
import { T, PageHeader, Panel, StatGrid, EmptyState } from "@/components/ui/TerminalCard";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ROLE_COLORS   = { Commander: T.orange, Lieutenant: T.amber, Scout: T.cyan, Engineer: T.green, Medic: "#ff5555", Grunt: T.textDim };
const STATUS_COLORS = { Active: T.green, Inactive: T.textDim, MIA: T.amber, KIA: T.red };
const ACT_COLORS    = { mission_completed: T.green, kill: T.red, death: T.amber, loot_found: T.cyan, resource_gathered: T.orange, player_joined: T.green, player_left: T.textDim };
const ACT_ICONS     = { mission_completed: "⚑", kill: "☠", death: "†", loot_found: "◆", resource_gathered: "◉", player_joined: "▶", player_left: "◀" };
const ACT_LABELS    = { mission_completed: "MISSION COMPLETED", kill: "KILL", death: "DEATH", loot_found: "LOOT FOUND", resource_gathered: "RESOURCES GATHERED", player_joined: "JOINED SERVER", player_left: "LEFT SERVER" };

// Derive achievements from stats
function computeAchievements(member, missions, activityLogs) {
  const achievements = [];
  const kills = member.kills || 0;
  const deaths = member.deaths || 0;
  const kd = deaths > 0 ? kills / deaths : kills;
  const playtime = member.playtime_hours || 0;
  const completedMissions = missions.filter(m => m.status === "Complete").length;

  if (kills >= 100)        achievements.push({ label: "CENTURION",      desc: "100+ kills",           icon: "☠", color: T.red });
  if (kills >= 50)         achievements.push({ label: "HUNTER",         desc: "50+ kills",            icon: "🎯", color: T.orange });
  if (kd >= 3)             achievements.push({ label: "APEX PREDATOR",  desc: "K/D ratio ≥ 3.0",     icon: "⚡", color: T.amber });
  if (kd >= 2)             achievements.push({ label: "MARKSMAN",       desc: "K/D ratio ≥ 2.0",     icon: "◎", color: T.cyan });
  if (playtime >= 100)     achievements.push({ label: "VETERAN",        desc: "100+ hours played",    icon: "★", color: T.amber });
  if (playtime >= 50)      achievements.push({ label: "SEASONED",       desc: "50+ hours played",     icon: "◈", color: T.textDim });
  if (completedMissions >= 10) achievements.push({ label: "MISSION EXPERT", desc: "10+ missions done", icon: "⚑", color: T.green });
  if (completedMissions >= 5)  achievements.push({ label: "FIELD OPS",  desc: "5+ missions done",     icon: "✦", color: T.cyan });
  if (member.role === "Commander") achievements.push({ label: "COMMANDER",  desc: "Clan commander",   icon: "◆", color: T.orange });
  if (member.status === "Active" && playtime > 0) achievements.push({ label: "ACTIVE DUTY", desc: "Currently active", icon: "●", color: T.green });

  return achievements;
}

export default function PlayerProfile() {
  const params   = new URLSearchParams(window.location.search);
  const memberId = params.get("id");

  const [member,   setMember]   = useState(null);
  const [missions, setMissions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!memberId) return;
    Promise.all([
      base44.entities.ClanMember.list("-created_date"),
      base44.entities.Mission.list("-created_date"),
      base44.entities.ActivityLog.filter({ clan_member_id: memberId }, "-timestamp", 50),
    ]).then(([members, allMissions, logs]) => {
      const m = members.find(x => x.id === memberId);
      setMember(m || null);
      // Filter missions that have this member's callsign in assigned_to
      const m2 = m ? allMissions.filter(mis =>
        Array.isArray(mis.assigned_to) && mis.assigned_to.includes(m.callsign)
      ) : [];
      setMissions(m2);
      setActivity(logs);
    }).finally(() => setLoading(false));
  }, [memberId]);

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
  const completedMissions = missions.filter(m => m.status === "Complete");
  const activeMissions    = missions.filter(m => m.status === "Active" || m.status === "Pending");
  const achievements      = computeAchievements(member, missions, activity);

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
                  <span style={{ color: m.status === "Active" ? T.green : T.amber, fontSize: "7px" }}>●</span>
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
    </div>
  );
}