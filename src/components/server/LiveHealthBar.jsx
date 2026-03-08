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

export default function LiveHealthBar({ status, statusLoading, lastPolled, downtimeAlert }) {
  const online = status?.online;
  const ping = status?.responseTime ?? null;
  const loss = status?.packetLoss ?? 0;
  const players = status?.playerCount ?? 0;

  const pingLabel = ping === null ? "---" : `${ping}ms`;
  const pingQuality = ping === null ? "NO DATA" : ping < 80 ? "EXCELLENT" : ping < 200 ? "FAIR" : "POOR";

  return (
    <div className="border" style={{ borderColor: online ? T.green + "44" : T.red + "44", background: "rgba(0,0,0,0.4)" }}>
      {/* Downtime alert banner */}
      <AnimatePresence>
        {downtimeAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 border-b text-xs"
            style={{ borderColor: T.red + "44", background: T.red + "18", color: T.red }}
          >
            <AlertTriangle size={10} style={{ animation: "threat-blink 0.8s infinite" }} />
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.15em" }}>
              ⚠ SERVER OFFLINE — DOWNTIME DETECTED
            </span>
            <span style={{ color: T.textFaint, fontSize: "9px", marginLeft: "auto" }}>
              {lastPolled ? `LAST SEEN: ${lastPolled}` : ""}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-stretch flex-wrap divide-x" style={{ divideColor: T.border }}>
        {/* Online status */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <motion.div
            animate={{ opacity: online ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: online ? T.green : T.red,
              boxShadow: `0 0 8px ${online ? T.green : T.red}` }}
          />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>SERVER</span>
            <span style={{ color: online ? T.green : T.red, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              {statusLoading ? "..." : online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Ping */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Wifi size={12} style={{ color: pingColor(ping) }} />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>PING</span>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={ping}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                style={{ color: pingColor(ping), fontFamily: "'Orbitron', monospace", fontSize: "13px" }}
              >
                {statusLoading ? "---" : pingLabel}
              </motion.span>
              <span style={{ color: pingColor(ping), fontSize: "8px" }}>{statusLoading ? "" : pingQuality}</span>
            </div>
          </div>
        </div>

        {/* Packet loss */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Radio size={12} style={{ color: lossColor(loss) }} />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>PACKET LOSS</span>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={loss}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                style={{ color: lossColor(loss), fontFamily: "'Orbitron', monospace", fontSize: "13px" }}
              >
                {statusLoading ? "---" : `${loss}%`}
              </motion.span>
              <span style={{ color: lossColor(loss), fontSize: "8px" }}>{loss === 0 ? "CLEAN" : loss < 33 ? "DEGRADED" : "CRITICAL"}</span>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderRight: `1px solid ${T.border}` }}>
          <Users size={12} style={{ color: T.cyan }} />
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>PLAYERS</span>
            <div className="flex items-baseline gap-1">
              <motion.span
                key={players}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "13px" }}
              >
                {statusLoading ? "---" : `${players}/64`}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Health bar */}
        <div className="flex-1 flex items-center gap-3 px-4 py-3">
          <Activity size={12} style={{ color: T.textFaint }} />
          <div className="flex flex-col flex-1" style={{ lineHeight: 1.2 }}>
            <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>HEALTH</span>
            {statusLoading ? (
              <span style={{ color: T.textFaint, fontSize: "9px" }}>POLLING...</span>
            ) : (
              <>
                {/* Visual health segments */}
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const healthPct = online ? Math.max(0, 100 - loss - (ping > 200 ? 30 : ping > 80 ? 10 : 0)) : 0;
                    const filled = i < Math.round(healthPct / 5);
                    return (
                      <div key={i} style={{
                        width: "8px", height: "6px",
                        background: filled ? (healthPct > 70 ? T.green : healthPct > 40 ? T.amber : T.red) : T.border,
                        opacity: filled ? 1 : 0.3,
                      }} />
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