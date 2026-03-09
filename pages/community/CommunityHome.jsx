import { Link } from "react-router-dom";
import { Pin, Radio } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, StatGrid, StatusBadge, Chip, T, rowAccent } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import VoiceChannelPanel from "@/components/voice/VoiceChannelPanel";

const TYPE_COLOR = {
  emergency:   T.red,
  intel:       T.cyan,
  ops:         T.amber,
  general:     T.green,
  maintenance: T.textDim,
};

const typeColor = (type) =>
  TYPE_COLOR[String(type || "general").toLowerCase()] || T.amber;

export default function CommunityHome() {
  const { data: announcements = [] } = useRealtimeEntityList({
    queryKey: ["community", "announcements", "overview"],
    entityName: "Announcement",
    queryFn: () => base44.entities.Announcement.list("-created_date", 30).catch(() => []),
    refetchInterval: 15_000,
    patchStrategy: "patch",
  });

  const { data: vouches = [] } = useRealtimeEntityList({
    queryKey: ["community", "vouches", "overview"],
    entityName: "PlayerVouch",
    queryFn: () => base44.entities.PlayerVouch.list("-created_date", 40).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });

  const pinned = announcements.filter((entry) => entry.pinned);

  return (
    <div className="p-3 space-y-3">
      <StatGrid
        stats={[
          { label: "BROADCASTS", value: announcements.length, color: T.amber },
          { label: "PINNED", value: pinned.length, color: T.cyan },
          { label: "VOUCHES", value: vouches.length, color: T.green },
        ]}
      />

      <Panel
        title="COMMUNITY CHANNELS"
        titleColor={T.purple}
        headerRight={(
          <div className="flex items-center gap-2">
            {[
              { label: "BROADCASTS", to: "/community/announcements", color: T.amber },
              { label: "INTEL", to: "/community/intel", color: T.cyan },
              { label: "VOUCHES", to: "/community/vouches", color: T.green },
            ].map(({ label, to, color }) => (
              <Link
                key={to}
                to={to}
                style={{
                  color, fontSize: "9px", textDecoration: "none", letterSpacing: "0.1em",
                  border: `1px solid ${color}44`, background: `${color}0e`,
                  padding: "2px 8px", fontFamily: "'Orbitron', monospace",
                }}
              >
                {label} →
              </Link>
            ))}
          </div>
        )}
      >
        <div className="p-3 text-xs" style={{ color: T.textDim, lineHeight: 1.6 }}>
          Community overlays track social coordination, announcements, and operator credibility while the map remains visible for tactical context.
        </div>
      </Panel>

      <Panel title="LATEST TRANSMISSIONS" titleColor={T.amber}>
        {announcements.length === 0 ? (
          <EmptyState icon={Radio} message="NO COMMUNITY TRANSMISSIONS" sub="No broadcasts on record" />
        ) : (
          <div>
            {announcements.slice(0, 8).map((entry) => {
              const tc = typeColor(entry.type);
              return (
                <div
                  key={entry.id}
                  className="relative px-3 py-2 border-b"
                  style={{ borderColor: `${T.border}66` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${tc}08`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={rowAccent(tc)} />
                  <div className="flex items-center gap-2 pl-2">
                    {entry.pinned && (
                      <Pin size={9} style={{ color: T.amber, flexShrink: 0 }} />
                    )}
                    <span style={{ color: T.text, fontSize: "10px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.title || "Untitled"}
                    </span>
                    <Chip label={entry.type || "General"} color={tc} />
                  </div>
                  <div className="pl-2 mt-0.5 flex items-center gap-2">
                    <span style={{ color: T.textFaint, fontSize: "9px" }}>
                      {entry.posted_by || "UNKNOWN"}
                    </span>
                    {entry.pinned && (
                      <StatusBadge label="PINNED" color={T.amber} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <VoiceChannelPanel
        title="COMMS VOICE DOCK"
        titleColor={T.cyan}
        includeMissionRooms={false}
        includeClanRoom={true}
        includeOpsRoom={true}
      />
    </div>
  );
}
