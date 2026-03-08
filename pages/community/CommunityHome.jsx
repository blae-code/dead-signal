import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, StatGrid, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import VoiceChannelPanel from "@/components/voice/VoiceChannelPanel";

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
        titleColor={T.purple || "#b060ff"}
        headerRight={(
          <div className="flex items-center gap-1">
            <Link to="/community/announcements" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              ANNOUNCEMENTS →
            </Link>
            <Link to="/community/intel" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              INTEL →
            </Link>
            <Link to="/community/vouches" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              VOUCHES →
            </Link>
          </div>
        )}
      >
        <div className="p-3 text-xs" style={{ color: T.textDim, lineHeight: 1.5 }}>
          Community overlays track social coordination, announcements, and operator credibility while the map remains
          visible for tactical context.
        </div>
      </Panel>

      <Panel title="LATEST TRANSMISSIONS" titleColor={T.amber}>
        {announcements.length === 0 ? (
          <EmptyState message="NO COMMUNITY TRANSMISSIONS" />
        ) : (
          <div>
            {announcements.slice(0, 8).map((entry) => (
              <div key={entry.id} className="px-3 py-2 border-b" style={{ borderColor: `${T.border}66` }}>
                <div style={{ color: T.text, fontSize: "10px" }}>{entry.title || "Untitled"}</div>
                <div style={{ color: T.textFaint, fontSize: "9px" }}>
                  {(entry.type || "General").toUpperCase()} • {entry.posted_by || "Unknown"}
                </div>
              </div>
            ))}
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
