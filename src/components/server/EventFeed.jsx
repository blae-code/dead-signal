import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, Users, AlertTriangle, Radio } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

const severityConfig = {
  CRITICAL: { color: T.red, icon: "⚠", label: "CRITICAL" },
  WARN: { color: T.orange, icon: "!", label: "WARNING" },
  INFO: { color: T.cyan, icon: "ℹ", label: "INFO" },
};

const eventTypeIcons = {
  "Player Join": Users,
  "Player Leave": Users,
  "Admin Action": Zap,
  "Downtime": AlertTriangle,
  "State Change": Zap,
};

function EventItem({ event, isNew }) {
  const severity = severityConfig[event.severity] || severityConfig.INFO;
  const Icon = eventTypeIcons[event.event_type] || Zap;
  const timestamp = new Date(event.created_date).toLocaleTimeString("en-US", { hour12: false });

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -16, height: 0 } : { opacity: 1, x: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, x: -16, height: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex gap-3 py-2.5 px-3 border-b last:border-b-0"
      style={{
        borderColor: T.border + "55",
        background: isNew ? `${severity.color}08` : "transparent",
      }}
    >
      {/* Severity accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "10%",
          bottom: "10%",
          width: "2px",
          background: severity.color,
          boxShadow: `0 0 4px ${severity.color}`,
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${severity.color}44`,
          background: `${severity.color}12`,
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <Icon size={10} style={{ color: severity.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            style={{
              color: severity.color,
              fontSize: "8px",
              fontFamily: "'Orbitron', monospace",
              letterSpacing: "0.14em",
              fontWeight: "bold",
              textShadow: `0 0 6px ${severity.color}44`,
            }}
          >
            {severity.label}
          </span>
          <span style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.12em" }}>
            {event.event_type}
          </span>
        </div>
        <div
          style={{
            color: T.text,
            fontSize: "9px",
            marginTop: "3px",
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {event.message}
        </div>
        <div style={{ color: T.textFaint, fontSize: "7px", marginTop: "4px", letterSpacing: "0.1em" }}>
          {timestamp}
        </div>
      </div>

      {/* New indicator */}
      {isNew && (
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: severity.color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${severity.color}`,
            marginTop: "6px",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}
    </motion.div>
  );
}

export default function EventFeed({ events = [], maxHeight = "400px" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSeverity = severityFilter === "ALL" || event.severity === severityFilter;
      const matchesSearch = searchTerm === "" || 
        event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [events, searchTerm, severityFilter]);

  const newEventCount = events.length > 0 ? 1 : 0; // First item is newest

  return (
    <div
      className="relative overflow-hidden"
      style={{
        border: `1px solid ${T.border}`,
        background: "linear-gradient(160deg, #1c1e21 0%, #14161a 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${T.green}44, transparent)`,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: T.border }}>
        <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Radio size={9} style={{ color: T.green }} />
        </div>
        <span style={{ color: T.green, fontSize: "8.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em", flex: 1, textShadow: `0 0 8px ${T.green}44` }}>
          LIVE EVENT FEED
        </span>
        {newEventCount > 0 && (
          <div
            style={{
              background: T.red,
              color: "white",
              fontSize: "7px",
              fontFamily: "'Orbitron', monospace",
              padding: "2px 5px",
              borderRadius: "2px",
              boxShadow: `0 0 6px ${T.red}`,
            }}
          >
            {newEventCount} NEW
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 py-2.5 border-b space-y-2" style={{ borderColor: T.border + "44", background: "rgba(0,0,0,0.2)" }}>
        {/* Search */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search
            size={10}
            style={{
              position: "absolute",
              left: "8px",
              color: T.textFaint,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: "26px",
              paddingRight: "6px",
              paddingTop: "4px",
              paddingBottom: "4px",
              fontSize: "8px",
              background: "rgba(0,0,0,0.4)",
              border: `1px solid ${T.border}`,
              color: T.text,
              fontFamily: "'Share Tech Mono', monospace",
            }}
          />
        </div>

        {/* Severity filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["ALL", "CRITICAL", "WARN", "INFO"].map(severity => (
            <button
              key={severity}
              onClick={() => setSeverityFilter(severity)}
              style={{
                padding: "2px 8px",
                fontSize: "7px",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: "0.12em",
                border: `1px solid ${severityFilter === severity ? (severityConfig[severity]?.color || T.textFaint) : T.border}`,
                background: severityFilter === severity ? `${severityConfig[severity]?.color || T.textFaint}15` : "transparent",
                color: severityFilter === severity ? (severityConfig[severity]?.color || T.textFaint) : T.textFaint,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              className="hover:opacity-80"
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div
        style={{
          maxHeight,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event, idx) => (
              <EventItem key={event.id || idx} event={event} isNew={idx === 0 && events[0]?.id === event.id} />
            ))
          ) : (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: T.textGhost,
                fontSize: "8px",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: "0.2em",
              }}
            >
              // NO EVENTS
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer stats */}
      {filteredEvents.length > 0 && (
        <div
          className="border-t px-4 py-2 text-center"
          style={{
            borderColor: T.border + "44",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <span style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.1em" }}>
            SHOWING {filteredEvents.length} OF {events.length} EVENTS
          </span>
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: ${T.borderBright}; border-radius: 2px; }
        div::-webkit-scrollbar-thumb:hover { background: ${T.border}; }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}