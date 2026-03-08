import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";

export default function LiveUptime({ initialUptime, statusLoading }) {
  const [uptime, setUptime] = useState(initialUptime || "--:--:--");
  const [key, setKey] = useState(0);

  // Parse uptime string to seconds, or return 0 if invalid
  const parseUptimeToSeconds = (uptimeStr) => {
    if (!uptimeStr || uptimeStr === "--:--:--") return 0;
    const parts = uptimeStr.split(":").map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // Format seconds to HH:MM:SS
  const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Update uptime every second
  useEffect(() => {
    if (statusLoading) return;

    let currentSeconds = parseUptimeToSeconds(initialUptime);

    const interval = setInterval(() => {
      currentSeconds += 1;
      setUptime(formatUptime(currentSeconds));
      // Force re-animation by updating key
      setKey(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [initialUptime, statusLoading]);

  // Update when initial uptime changes (new server status poll)
  useEffect(() => {
    if (!statusLoading && initialUptime && initialUptime !== "--:--:--") {
      setUptime(initialUptime);
      setKey(prev => prev + 1);
    }
  }, [initialUptime, statusLoading]);

  const getUptimeColor = () => {
    const seconds = parseUptimeToSeconds(uptime);
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) return T.green;
    if (hours >= 12) return T.cyan;
    if (hours >= 4) return T.amber;
    return T.red;
  };

  return (
    <div
      style={{
        color: getUptimeColor(),
        fontFamily: "'Orbitron', monospace",
        fontSize: "13px",
        fontWeight: "bold",
        minWidth: "48px",
        textAlign: "right",
      }}
    >
      {uptime}
    </div>
  );
}