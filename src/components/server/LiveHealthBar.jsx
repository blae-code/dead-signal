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

  return (
    <div className="border" style={{ borderColor: online === true ? T.green + "44" : T.red + "44", background: "rgba(0,0,0,0.4)" }}>
      <AnimatePresence>
        {downtimeAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 border-b text-xs"
            style={{ borderColor: T.red + "44", background: T.red + "18", color: T.red }}
          >
            <AlertTriangle size={10} className={animationEnabled ? "threat-blink" : undefined} />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.15em" }}>
              SERVER OFFLINE - DOWNTIME DETECTED
            </span>
            <span style={{ color: T.textFaint, fontSize: "9px", marginLeft: "auto" }}>
              {lastPolled ? `LAST SEEN: ${lastPolled}` : ""}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-stretch flex-wrap divide-x" style={{ divideColor: T.border }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <motion.div
            animate={animationEnabled && online === true ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={animationEnabled && online === true ? { duration: 1.5, repeat: Infinity } : undefined}
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: online === true ? T.green : online === false ? T.red : T.textFaint, boxShadow: online === true ? `0 0 8px ${T.green}` : "none" }}
          />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>SERVER</span>
            <span style={{ color: online === true ? T.green : online === false ? T.red : T.textFaint, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              {statusLoading ? "..." : online === null ? "UNAVAILABLE" : online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Wifi size={12} style={{ color: pingColor(ping) }} />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>PING</span>
            <div className="flex items-baseline gap-1">
              <motion.span key={pingLabel} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: pingColor(ping), fontFamily: "'Orbitron', monospace", fontSize: "13px" }}>
                {statusLoading ? "..." : pingLabel}
              </motion.span>
              <span style={{ color: pingColor(ping), fontSize: "8px" }}>{statusLoading ? "" : pingQuality}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Radio size={12} style={{ color: packetLossValue === null ? T.textFaint : packetLossValue < 33 ? T.amber : T.red }} />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>PACKET LOSS</span>
            <div className="flex items-baseline gap-1">
              <motion.span key={packetLossLabel} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: packetLossValue === null ? T.textFaint : packetLossValue < 33 ? T.amber : T.red, fontFamily: "'Orbitron', monospace", fontSize: "13px" }}>
                {statusLoading ? "..." : packetLossLabel}
              </motion.span>
              <span style={{ color: packetLossValue === null ? T.textFaint : packetLossValue < 33 ? T.amber : T.red, fontSize: "8px" }}>
                {statusLoading ? "" : packetLossQuality}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Users size={12} style={{ color: players === null ? T.textFaint : T.cyan }} />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>PLAYERS</span>
            <motion.span key={players ?? "na"} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} style={{ color: players === null ? T.textFaint : T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "13px" }}>
              {statusLoading ? "..." : players === null ? "UNAVAILABLE" : `${players}/64`}
            </motion.span>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 py-3">
          <Activity size={12} style={{ color: T.textFaint }} />
          <div className="flex flex-col flex-1" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>HEALTH</span>
            {statusLoading ? (
              <span style={{ color: T.textFaint, fontSize: "9px" }}>POLLING...</span>
            ) : healthPct === null ? (
              <span style={{ color: T.textFaint, fontSize: "9px" }}>UNAVAILABLE (MISSING LIVE SIGNALS)</span>
            ) : (
              <>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 20 }).map((_, index) => {
                    const filled = index < Math.round(healthPct / 5);
                    return (
                      <div
                        key={index}
                        style={{
                          width: "8px",
                          height: "6px",
                          background: filled ? (healthPct > 70 ? T.green : healthPct > 40 ? T.amber : T.red) : T.border,
                          opacity: filled ? 1 : 0.3,
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{ color: T.textFaint, fontSize: "8px", marginTop: "2px" }}>
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

