import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Users, AlertTriangle, Activity, Radio } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";
import { useAnimationEnabled } from "@/hooks/use-animation-enabled";
import { useLiveMetric } from "@/hooks/use-live-metric";

function pingColor(ms) {
  if (ms === null || ms === undefined) return T.textFaint;
  if (ms < 80) return T.green;
  if (ms < 200) return T.amber;
  return T.red;
}

export default function LiveHealthBar({ status, statusLoading, lastPolled, downtimeAlert }) {
  const animationEnabled = useAnimationEnabled();
  const onlineMetric = useLiveMetric(status, "online");
  const pingMetric = useLiveMetric(status, "responseTime");
  const playersMetric = useLiveMetric(status, "playerCount");

  const online = onlineMetric.available ? Boolean(onlineMetric.value) : null;
  const ping = pingMetric.available && typeof pingMetric.value === "number" ? pingMetric.value : null;
  const players = playersMetric.available && typeof playersMetric.value === "number" ? playersMetric.value : null;
  const packetLossAvailable = status?.metrics?.packetLoss?.available === true;
  const packetLossValue = packetLossAvailable ? status.metrics.packetLoss.value : null;

  const pingLabel = ping === null ? "UNAVAILABLE" : `${ping}ms`;
  const pingQuality = ping === null ? "NO DATA" : ping < 80 ? "EXCELLENT" : ping < 200 ? "FAIR" : "POOR";
  const packetLossLabel = packetLossValue === null ? "UNAVAILABLE" : `${packetLossValue}%`;
  const packetLossQuality = packetLossValue === null
    ? "NO DATA"
    : packetLossValue === 0 ? "CLEAN" : packetLossValue < 33 ? "DEGRADED" : "CRITICAL";

  const healthPct = online === true && ping !== null && packetLossValue !== null
    ? Math.max(0, 100 - packetLossValue - (ping > 200 ? 30 : ping > 80 ? 10 : 0))
    : null;

  const onlineColor = online === true ? T.green : online === false ? T.red : T.textFaint;

  return (
    <div className="relative overflow-hidden" style={{ border: `1px solid ${onlineColor}33`, background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)" }}>
      {/* Top accent hairline */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${onlineColor}66 30%, ${onlineColor}99 50%, ${onlineColor}66 70%, transparent)`, pointerEvents: "none" }} />

      <AnimatePresence>
        {downtimeAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2 border-b relative overflow-hidden"
            style={{ borderColor: T.red + "44", background: T.red + "14", color: T.red }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.red}88, transparent)` }} />
            <AlertTriangle size={10} className={animationEnabled ? "threat-blink" : undefined} style={{ filter: `drop-shadow(0 0 4px ${T.red})` }} />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.15em", textShadow: `0 0 8px ${T.red}66` }}>
              SERVER OFFLINE — DOWNTIME DETECTED
            </span>
            <span style={{ color: T.textFaint, fontSize: "8px", marginLeft: "auto", fontFamily: "'Share Tech Mono', monospace" }}>
              {lastPolled ? `LAST SEEN: ${lastPolled}` : ""}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-stretch flex-wrap">
        {/* SERVER STATUS */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <motion.div
            animate={animationEnabled && online === true ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
            transition={animationEnabled && online === true ? { duration: 1.5, repeat: Infinity } : undefined}
            style={{ width: 9, height: 9, borderRadius: "50%", background: onlineColor, boxShadow: online === true ? `0 0 10px ${T.green}, 0 0 20px ${T.green}44` : "none", flexShrink: 0 }}
          />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ color: T.textGhost, fontSize: "7px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace" }}>SERVER</div>
            <div style={{ color: onlineColor, fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: 700, textShadow: online === true ? `0 0 8px ${T.green}66` : "none" }}>
              {statusLoading ? "···" : online === null ? "N/A" : online ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>

        {/* PING */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Wifi size={13} style={{ color: pingColor(ping), filter: ping !== null ? `drop-shadow(0 0 3px ${pingColor(ping)}88)` : "none" }} />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ color: T.textGhost, fontSize: "7px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace" }}>PING</div>
            <div className="flex items-baseline gap-1.5">
              <motion.span key={pingLabel} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: pingColor(ping), fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 700, textShadow: `0 0 8px ${pingColor(ping)}55` }}>
                {statusLoading ? "···" : pingLabel}
              </motion.span>
              <span style={{ color: pingColor(ping) + "99", fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.08em" }}>{statusLoading ? "" : pingQuality}</span>
            </div>
          </div>
        </div>

        {/* PACKET LOSS */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Radio size={13} style={{ color: packetLossValue === null ? T.textFaint : packetLossValue < 33 ? T.amber : T.red }} />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ color: T.textGhost, fontSize: "7px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace" }}>PKT LOSS</div>
            <div className="flex items-baseline gap-1.5">
              <motion.span key={packetLossLabel} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: packetLossValue === null ? T.textFaint : packetLossValue < 33 ? T.amber : T.red, fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 700 }}>
                {statusLoading ? "···" : packetLossLabel}
              </motion.span>
              <span style={{ color: T.textGhost, fontSize: "7.5px", fontFamily: "'Orbitron', monospace" }}>{statusLoading ? "" : packetLossQuality}</span>
            </div>
          </div>
        </div>

        {/* PLAYERS */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Users size={13} style={{ color: players === null ? T.textFaint : T.cyan }} />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ color: T.textGhost, fontSize: "7px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace" }}>PLAYERS</div>
            <motion.span key={players ?? "na"} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: players === null ? T.textFaint : T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 700, textShadow: players !== null ? `0 0 8px ${T.cyan}55` : "none", display: "block" }}>
              {statusLoading ? "···" : players === null ? "N/A" : `${players}/64`}
            </motion.span>
          </div>
        </div>

        {/* HEALTH BAR */}
        <div className="flex-1 flex items-center gap-3 px-4 py-3">
          <Activity size={13} style={{ color: T.textFaint, flexShrink: 0 }} />
          <div className="flex flex-col flex-1" style={{ lineHeight: 1.25 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ color: T.textGhost, fontSize: "7px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace" }}>SYS HEALTH</span>
              {healthPct !== null && <span style={{ color: healthPct > 70 ? T.green : healthPct > 40 ? T.amber : T.red, fontSize: "9px", fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>{healthPct.toFixed(0)}%</span>}
            </div>
            {statusLoading ? (
              <span style={{ color: T.textGhost, fontSize: "8.5px", fontFamily: "'Orbitron', monospace" }}>POLLING···</span>
            ) : healthPct === null ? (
              <span style={{ color: T.textGhost, fontSize: "8px", fontFamily: "'Share Tech Mono', monospace" }}>AWAITING LIVE SIGNALS</span>
            ) : (
              <>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 20 }).map((_, i) => {
                    const filled = i < Math.round(healthPct / 5);
                    const barColor = healthPct > 70 ? T.green : healthPct > 40 ? T.amber : T.red;
                    return (
                      <div key={i} style={{
                        flex: 1, height: 8,
                        background: filled ? barColor : "rgba(0,0,0,0.5)",
                        border: `1px solid ${filled ? barColor + "88" : T.border}`,
                        boxShadow: filled ? `0 0 4px ${barColor}66` : "none",
                        transition: "background 0.3s",
                      }} />
                    );
                  })}
                </div>
                <span style={{ color: T.textGhost, fontSize: "7.5px", marginTop: 3, fontFamily: "'Share Tech Mono', monospace" }}>
                  {lastPolled ? `UPDATED ${lastPolled}` : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}