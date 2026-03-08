import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Trash2, Send, Loader } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

const TABS = {
  CONSOLE: "console",
  EVENTS: "events",
  HISTORY: "history",
};

export default function BottomConsoleDrawer({
  consoleLines,
  onConsoleInput,
  onConsoleClear,
  events,
  logFilter,
  onLogFilterChange,
  onLogEvent,
  rconHistory,
  onRconRerun,
  onRconClear,
  cmd,
  onCmdChange,
  rconLoading,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.CONSOLE);
  const [y, setY] = useState(0);
  const consoleRef = React.useRef(null);
  const logRef = React.useRef(null);

  const filteredEvents = logFilter === "ALL" ? events : events.filter(e => e.severity === logFilter);
  const severityColor = (s) => ({ CRITICAL: "#ff2020", ALERT: "#ff6a00", WARN: "#ffaa00", INFO: "#39ff1488" }[s] || "#39ff1488");

  React.useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        borderColor: T.border,
        background: T.bg1,
        maxHeight: "70vh",
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDrag={(e, { offset }) => {
        if (isExpanded) setY(offset.y);
      }}
      onDragEnd={(e, { offset, velocity }) => {
        if (velocity.y > 500 || offset.y > 100) {
          setIsExpanded(false);
          setY(0);
        } else if (velocity.y < -500 || offset.y < -100) {
          setIsExpanded(true);
          setY(0);
        }
      }}
      initial={{ y: "calc(100vh - 44px)" }}
      animate={{
        y: isExpanded ? 0 : "calc(100vh - 44px)",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }}
    >
      {/* Draggable header */}
      <motion.div
        className="flex items-center justify-between px-4 py-2 border-b cursor-grab active:cursor-grabbing"
        style={{ borderColor: T.border, background: T.bg0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
      >
        <div className="flex items-center gap-3 flex-1">
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronUp
              size={14}
              style={{
                color: T.textDim,
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
              }}
            />
          </motion.button>

          {/* Tabs */}
          <div className="flex gap-1">
            {[
              { key: TABS.CONSOLE, label: "CONSOLE" },
              { key: TABS.EVENTS, label: "EVENTS" },
              { key: TABS.HISTORY, label: "HISTORY" },
            ].map(({ key, label }) => (
              <motion.button
                key={key}
                onClick={() => setActiveTab(key)}
                className="text-xs px-2 py-1 border"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  borderColor: activeTab === key ? T.green : T.border,
                  color: activeTab === key ? T.green : T.textFaint,
                  background: activeTab === key ? T.green + "11" : "transparent",
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "9px",
                  cursor: "pointer",
                }}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {activeTab === TABS.CONSOLE && (
          <motion.button
            onClick={onConsoleClear}
            className="p-1 hover:opacity-70 transition-opacity"
            whileHover={{ scale: 1.1 }}
          >
            <Trash2 size={12} style={{ color: T.textFaint }} />
          </motion.button>
        )}
      </motion.div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col"
          style={{ height: isExpanded ? "calc(70vh - 200px)" : "0px", overflow: "hidden" }}
        >
          {/* Console Tab */}
          {activeTab === TABS.CONSOLE && (
            <>
              <div ref={consoleRef} className="flex-1 p-3 overflow-y-auto text-xs space-y-0.5">
                <AnimatePresence mode="popLayout">
                  {consoleLines.map((l, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ color: l.color, fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {l.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Console input */}
              <div className="flex border-t" style={{ borderColor: T.border }}>
                <span className="px-3 py-2 text-xs" style={{ color: "#39ff14" }}>
                  &gt;
                </span>
                <input
                  className="flex-1 bg-transparent text-xs py-2 pr-2 outline-none border-0"
                  style={{ color: "#39ff14", fontFamily: "'Share Tech Mono', monospace" }}
                  value={cmd}
                  onChange={(e) => onCmdChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onConsoleInput()}
                  placeholder="enter command..."
                />
                <motion.button
                  onClick={onConsoleInput}
                  className="px-3 py-2"
                  disabled={rconLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {rconLoading ? (
                    <Loader size={12} style={{ color: "#39ff1488", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Send size={12} style={{ color: "#39ff14" }} />
                  )}
                </motion.button>
              </div>
            </>
          )}

          {/* Events Tab */}
          {activeTab === TABS.EVENTS && (
            <>
              <div className="flex gap-1 px-3 py-2 border-b" style={{ borderColor: T.border }}>
                {["ALL", "INFO", "WARN", "CRITICAL"].map((f) => (
                  <motion.button
                    key={f}
                    onClick={() => onLogFilterChange(f)}
                    className="text-xs px-2 py-0.5 border"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      borderColor: logFilter === f ? T.green : T.border,
                      color: logFilter === f ? T.green : T.textFaint,
                      background: logFilter === f ? T.green + "11" : "transparent",
                      fontFamily: "'Orbitron', monospace",
                    }}
                  >
                    {f}
                  </motion.button>
                ))}
              </div>

              <div ref={logRef} className="flex-1 p-3 overflow-y-auto space-y-1">
                <AnimatePresence mode="popLayout">
                  {filteredEvents.length === 0 ? (
                    <motion.div key="no-events" className="text-xs" style={{ color: T.textFaint }}>
                      // NO EVENTS
                    </motion.div>
                  ) : (
                    filteredEvents.map((e) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="text-xs flex gap-2"
                      >
                        <span style={{ color: T.textFaint, flexShrink: 0 }}>
                          [{new Date(e.created_date).toLocaleTimeString("en-US", { hour12: false })}]
                        </span>
                        <span style={{ color: severityColor(e.severity) }}>[{e.severity}]</span>
                        <span style={{ color: T.textDim }}>{e.message}</span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="px-3 py-2 border-t flex gap-2" style={{ borderColor: T.border }}>
                <motion.button
                  onClick={() => onLogEvent("Broadcast", "Server restarting in 10 min", "WARN")}
                  className="text-xs px-3 py-1 border transition-opacity hover:opacity-80"
                  style={{ borderColor: T.amber + "88", color: T.amber }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  WARN RESTART
                </motion.button>
                <motion.button
                  onClick={() => onLogEvent("Server Start", "Server online", "INFO")}
                  className="text-xs px-3 py-1 border transition-opacity hover:opacity-80"
                  style={{ borderColor: T.green + "88", color: T.green }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  LOG ONLINE
                </motion.button>
              </div>
            </>
          )}

          {/* History Tab */}
          {activeTab === TABS.HISTORY && (
            <>
              <div className="flex-1 p-3 overflow-y-auto space-y-1">
                {rconHistory.length === 0 ? (
                  <div className="text-xs" style={{ color: T.textFaint }}>
                    // NO HISTORY
                  </div>
                ) : (
                  rconHistory.map((h, i) => (
                    <motion.div
                      key={i}
                      className="border p-2 cursor-pointer hover:border-opacity-100 transition-all"
                      style={{
                        borderColor: h.success ? T.green + "44" : T.red + "44",
                        background: h.success ? T.green + "08" : T.red + "08",
                      }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex gap-2 items-start justify-between mb-1">
                        <span className="text-xs font-mono" style={{ color: "#39ff14" }}>
                          {h.command}
                        </span>
                        <motion.button
                          onClick={() => onRconRerun(h.command)}
                          className="text-xs px-2 py-0.5 border"
                          style={{ borderColor: T.cyan, color: T.cyan }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          RERUN
                        </motion.button>
                      </div>
                      <div className="text-xs" style={{ color: h.success ? T.green : T.red }}>
                        {h.output}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {rconHistory.length > 0 && (
                <div className="px-3 py-2 border-t" style={{ borderColor: T.border }}>
                  <motion.button
                    onClick={onRconClear}
                    className="text-xs px-3 py-1 border"
                    style={{ borderColor: T.red + "88", color: T.red }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    CLEAR HISTORY
                  </motion.button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
