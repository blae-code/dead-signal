import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Users, AlertTriangle, Activity, Radio } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

function pingColor(ms) {
  if (ms === null || ms === undefined) return T.textFaint;
  if (ms < 80) return T.green;
  if (ms < 200) return T.amber;
  return T.red;
}

function lossColor(pct) {
  if (pct === 0) return T.green;
  if (pct < 33) return T.amber;
  return T.red;
}

function MetricBlock({ icon: Icon, label, value, sub, color, border }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 relative"
      style={{ borderRight: border ? `1px solid ${T.border}` : "none" }}
    >
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", height: "1px", width: "40%", background: `linear-gradient(90deg, transparent, ${color}44, transparent)` }} />
      <Icon size={12} style={{ color: color + "bb", flexShrink: 0 }} />
      <div style={{ lineHeight: 1.25 }}>
        <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.18em", marginBottom: "1px" }}>{label}</div>
        <div style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: "bold", textShadow: `0 0 8px ${color}66` }}>
          {value}
        </div>
        {sub && <div style={{ color: color + "88", fontSize: "7.5px", letterSpacing: "0.08em" }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function LiveHealthBar({ status, statusLoading, lastPolled, downtimeAlert }) {
  const online  = status?.online;
  const ping    = status?.responseTime ?? null;
  const loss    = status?.packetLoss ?? 0;
  const players = status?.playerCount ?? 0;
  const healthPct = online ? Math.max(0, 100 - loss - (ping > 200 ? 30 : ping > 80 ? 10 : 0)) : 0;
  const healthColor = healthPct > 70 ? T.green : healthPct > 40 ? T.amber : T.red;

  const pingLabel   = ping === null ? "---" : `${ping}ms`;
  const pingQuality = ping === null ? "NO DATA" : ping < 80 ? "EXCELLENT" : ping < 200 ? "FAIR" : "POOR";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        border: `1px solid ${online ? T.green + "33" : T.red + "33"}`,
        background: "linear-gradient(160deg, #0e0a06 0%, #0a0704 100%)",
        boxShadow: `inset 0 1px 0 ${(online ? T.green : T.red)}12`,
      }}
    >
      {/* Top hairline */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${online ? T.green : T.red}55, transparent)` }} />

      {/* Downtime alert */}
      <AnimatePresence>
        {downtimeAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2 border-b"
            style={{ borderColor: T.red + "33", background: "rgba(255,0,0,0.06)", color: T.red }}
          >
            <AlertTriangle size={9} style={{ animation: "threat-blink 0.8s infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "8px", letterSpacing: "0.18em" }}>
              ⚠ SERVER OFFLINE — DOWNTIME DETECTED
            </span>
            {lastPolled && (
              <span style={{ color: T.textFaint, fontSize: "8px", marginLeft: "auto" }}>LAST SEEN: {lastPolled}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-stretch flex-wrap">
        {/* Online status */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <div style={{ position: "relative", width: "14px", height: "14px", flexShrink: 0 }}>
            {online && !statusLoading && (
              <motion.div
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.green }}
              />
            )}
            <div style={{ position: "absolute", inset: "2px", borderRadius: "50%", background: statusLoading ? T.textFaint : online ? T.green : T.red, boxShadow: statusLoading ? "none" : `0 0 8px ${online ? T.green : T.red}` }} />
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.18em", marginBottom: "1px" }}>SERVER</div>
            <div style={{
              color: statusLoading ? T.textFaint : online ? T.green : T.red,
              fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: "bold",
              textShadow: statusLoading ? "none" : `0 0 10px ${online ? T.green : T.red}88`,
            }}>
              {statusLoading ? "POLLING" : online ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>

        <MetricBlock icon={Wifi}   label="PING"        value={statusLoading ? "---" : pingLabel}     sub={statusLoading ? "" : pingQuality}          color={pingColor(ping)}  border />
        <MetricBlock icon={Radio}  label="PACKET LOSS" value={statusLoading ? "---" : `${loss}%`}    sub={loss === 0 ? "CLEAN" : loss < 33 ? "DEGRADED" : "CRITICAL"} color={lossColor(loss)}  border />
        <MetricBlock icon={Users}  label="PLAYERS"     value={statusLoading ? "---" : `${players}/64`} sub={`${Math.round(players / 0.64)}% cap`}   color={T.cyan}           border />

        {/* Health bar */}
        <div className="flex-1 flex items-center gap-3 px-4 py-3" style={{ minWidth: "180px" }}>
          <Activity size={11} style={{ color: T.textFaint, flexShrink: 0 }} />
          <div className="flex flex-col flex-1">
            <div className="flex justify-between mb-1.5">
              <span style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.18em" }}>SERVER HEALTH</span>
              <span style={{ color: healthColor, fontSize: "7.5px", fontFamily: "'Orbitron', monospace", textShadow: `0 0 6px ${healthColor}` }}>
                {healthPct.toFixed(0)}%
              </span>
            </div>
            {statusLoading ? (
              <span style={{ color: T.textFaint, fontSize: "8px" }}>POLLING...</span>
            ) : (
              <>
                <div style={{ display: "flex", gap: "2px" }}>
                  {Array.from({ length: 20 }).map((_, i) => {
                    const filled = i < Math.round(healthPct / 5);
                    return (
                      <div key={i} style={{
                        flex: 1, height: "6px",
                        background: filled ? healthColor : T.border,
                        opacity: filled ? 1 : 0.2,
                        boxShadow: filled ? `0 0 4px ${healthColor}88` : "none",
                      }} />
                    );
                  })}
                </div>
                {lastPolled && (
                  <span style={{ color: T.textFaint, fontSize: "7px", marginTop: "3px", letterSpacing: "0.1em" }}>
                    UPDATED {lastPolled}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}