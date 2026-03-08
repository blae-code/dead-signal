import { T, EmptyState } from "@/components/ui/TerminalCard";

const STATUS_COLORS = {
  queued: T.textDim,
  running: T.cyan,
  success: T.green,
  failed: T.red,
  blocked: T.amber,
};

export default function ExecutionTimeline({ events = [] }) {
  if (!Array.isArray(events) || events.length === 0) {
    return <EmptyState message="NO EXECUTION EVENTS" />;
  }

  return (
    <div className="max-h-72 overflow-y-auto">
      {events.map((event) => {
        const status = typeof event.status === "string" ? event.status : "queued";
        const color = STATUS_COLORS[status] || T.textDim;
        return (
          <div
            key={event.id}
            className="border-b px-3 py-2"
            style={{ borderColor: T.border + "66" }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color, fontSize: "8px" }}>●</span>
              <span style={{ color: T.text, fontSize: "10px" }}>{event.label}</span>
              <span style={{ color, fontSize: "8px", letterSpacing: "0.08em" }}>{status.toUpperCase()}</span>
              <span className="ml-auto" style={{ color: T.textFaint, fontSize: "8px" }}>{event.at}</span>
            </div>
            {event.detail && (
              <pre
                className="mt-1 whitespace-pre-wrap"
                style={{ color: T.textDim, fontSize: "9px", fontFamily: "'Share Tech Mono', monospace" }}
              >
                {event.detail}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
