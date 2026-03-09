import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

const SEV_COLORS = { INFO: T.cyan, WARN: T.amber, ALERT: T.orange, CRITICAL: T.red };

export default function InAppNotifications() {
  const [events, setEvents] = useState([]);
  const [unread, setUnread] = useState([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_events") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const all = await base44.entities.ServerEvent.list("-created_date", 20);
        const filtered = all.filter(e => ["CRITICAL", "ALERT", "WARN"].includes(e.severity));
        setEvents(filtered);
        setUnread(filtered.filter(e => !dismissed.includes(e.id)));
      } catch (err) {
        // Silently ignore rate limit / network errors for notifications
      }
    };
    loadRecent();

    const unsub = base44.entities.ServerEvent.subscribe(event => {
      if (event.type === "create" && ["CRITICAL","ALERT","WARN"].includes(event.data?.severity)) {
        setEvents(prev => [event.data, ...prev]);
        setUnread(prev => [event.data, ...prev]);
      }
    });
    return unsub;
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("dismissed_events", JSON.stringify(next));
    setUnread(prev => prev.filter(e => e.id !== id));
  };

  const dismissAll = () => {
    const ids = unread.map(e => e.id);
    const next = [...dismissed, ...ids];
    setDismissed(next);
    localStorage.setItem("dismissed_events", JSON.stringify(next));
    setUnread([]);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ position: "relative", padding: "4px 8px", color: unread.length > 0 ? T.amber : T.textDim, background: "transparent", border: "none" }}>
        <Bell size={14} />
        {unread.length > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0, width: 14, height: 14,
            background: T.red, borderRadius: "50%", fontSize: "8px",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            fontFamily: "'Orbitron', monospace"
          }}>{unread.length > 9 ? "9+" : unread.length}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", zIndex: 1000,
          width: 320, background: T.bg1, border: `1px solid ${T.border}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.7)"
        }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: T.border }}>
            <span style={{ color: T.amber, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>
              ALERTS ({unread.length} NEW)
            </span>
            <div className="flex gap-2">
              {unread.length > 0 && (
                <button onClick={dismissAll} style={{ color: T.textFaint, fontSize: "9px" }}>CLEAR ALL</button>
              )}
              <button onClick={() => setOpen(false)} style={{ color: T.textFaint }}>
                <X size={12} />
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {unread.length === 0 && events.length === 0 && (
              <div style={{ color: T.textFaint, fontSize: "10px", padding: "16px", textAlign: "center" }}>
                // NO ALERTS
              </div>
            )}
            {unread.map(e => (
              <div key={e.id} className="flex items-start gap-2 px-3 py-2 border-b"
                style={{ borderColor: T.border + "66", background: SEV_COLORS[e.severity] + "0a" }}>
                <div className="flex-1">
                  <div style={{ color: SEV_COLORS[e.severity] || T.text, fontSize: "10px", fontWeight: "bold" }}>
                    [{e.severity}] {e.event_type}
                  </div>
                  <div style={{ color: T.textDim, fontSize: "10px" }}>{e.message}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>{e.created_date?.slice(0,16)}</div>
                </div>
                <button onClick={() => dismiss(e.id)} style={{ color: T.textFaint, flexShrink: 0 }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}