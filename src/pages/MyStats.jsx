import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart2, Skull } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { T, PageHeader, Panel, StatGrid } from "@/components/ui/TerminalCard";

export default function MyStats() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const members = await base44.entities.ClanMember.filter({ user_email: u.email });
      if (members.length) setMember(members[0]);
      const acts = await base44.entities.ActivityLog.filter({ clan_member_id: members[0]?.id || "" }, "-timestamp", 100);
      setActivities(acts);
      setLoading(false);
    };
    load();
  }, []);

  // Build daily kill/death chart from activity logs
  const buildDailyChart = () => {
    const map = {};
    activities.forEach(a => {
      const day = a.timestamp ? a.timestamp.slice(0, 10) : "unknown";
      if (!map[day]) map[day] = { day, kills: 0, deaths: 0 };
      if (a.activity_type === "kill") map[day].kills++;
      if (a.activity_type === "death") map[day].deaths++;
    });
    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  };

  const buildActivityBreakdown = () => {
    const map = {};
    activities.forEach(a => {
      map[a.activity_type] = (map[a.activity_type] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  };

  const kd = member ? (member.deaths > 0 ? (member.kills / member.deaths).toFixed(2) : member.kills) : "—";
  const dailyData = buildDailyChart();
  const breakdown = buildActivityBreakdown();

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.bg1, border: `1px solid ${T.border}`, padding: "8px 12px" }}>
        <div style={{ color: T.textDim, fontSize: "10px", marginBottom: 4 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, fontSize: "11px" }}>{p.name}: {p.value}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={BarChart2} title="MY STATS" color={T.cyan} />

      {loading ? (
        <div style={{ color: T.textFaint, fontSize: "11px" }}>// LOADING STATS...</div>
      ) : !member ? (
        <div style={{ color: T.textFaint, fontSize: "11px" }}>// NO CLAN PROFILE FOUND — REGISTER IN CLAN ROSTER FIRST</div>
      ) : (
        <>
          {/* Identity */}
          <div className="border p-3" style={{ borderColor: T.border, background: T.bg1 }}>
            <div className="flex items-center gap-3">
              <Skull size={20} style={{ color: T.gold }} />
              <div>
                <div style={{ color: T.gold, fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: "bold" }}>{member.callsign}</div>
                <div style={{ color: T.textDim, fontSize: "10px" }}>{member.role} · {member.status}</div>
              </div>
            </div>
          </div>

          {/* Core stats */}
          <StatGrid stats={[
            { label: "KILLS", value: member.kills || 0, color: T.red },
            { label: "DEATHS", value: member.deaths || 0, color: T.textDim },
            { label: "K/D RATIO", value: kd, color: parseFloat(kd) >= 1 ? T.green : T.amber },
            { label: "PLAYTIME (HRS)", value: member.playtime_hours || 0, color: T.cyan },
          ]} />

          {/* Kill/Death trend */}
          {dailyData.length > 0 && (
            <Panel title="KILL / DEATH TREND (14 DAYS)" titleColor={T.red}>
              <div className="p-3" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
                    <XAxis dataKey="day" tick={{ fill: T.textFaint, fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fill: T.textFaint, fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="kills" stroke={T.red} strokeWidth={2} dot={false} name="Kills" />
                    <Line type="monotone" dataKey="deaths" stroke={T.amber} strokeWidth={2} dot={false} name="Deaths" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {/* Activity breakdown */}
          {breakdown.length > 0 && (
            <Panel title="ACTIVITY BREAKDOWN" titleColor={T.cyan}>
              <div className="p-3" style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown}>
                    <CartesianGrid strokeDasharray="2 4" stroke={T.border} />
                    <XAxis dataKey="type" tick={{ fill: T.textFaint, fontSize: 9 }} />
                    <YAxis tick={{ fill: T.textFaint, fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={T.cyan} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {breakdown.length === 0 && dailyData.length === 0 && (
            <div style={{ color: T.textFaint, fontSize: "11px", padding: "16px", border: `1px solid ${T.border}`, textAlign: "center" }}>
              // NO ACTIVITY LOGGED YET — LOG KILLS AND DEATHS VIA ACTIVITY LOG
            </div>
          )}

          {/* Notes */}
          {member.notes && (
            <Panel title="OPERATOR NOTES" titleColor={T.textDim}>
              <div className="p-3" style={{ color: T.textDim, fontSize: "11px", lineHeight: 1.6 }}>{member.notes}</div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}