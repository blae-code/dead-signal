import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Save } from "lucide-react";
import { ActionBtn, Field, Panel, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import LiveStatusStrip from "@/components/live/LiveStatusStrip";

const PRESENCE_STATUSES = ["active", "in_raid", "on_patrol", "resting", "offline"];
const PRESENCE_MOODS = ["focused", "aggressive", "stealth", "support", "defensive"];

const parseTs = (value) => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (a, b) => {
  const left = parseTs(a?.updated_at || a?.updated_date || a?.created_date || a?.timestamp);
  const right = parseTs(b?.updated_at || b?.updated_date || b?.created_date || b?.timestamp);
  return right - left;
};

const telemetryBucket = (timestamp) => {
  const ts = parseTs(timestamp);
  if (!ts) return "stale";
  const ageMs = Math.max(0, Date.now() - ts);
  if (ageMs <= 5_000) return "fresh";
  if (ageMs <= 30_000) return "delayed";
  return "stale";
};

const defaultDraft = (member, current = null) => ({
  status: current?.status || "active",
  mood: current?.mood || "focused",
  objective: current?.objective || "",
  squad: current?.squad || "",
  voice_channel: current?.voice_channel || "",
  home_sector: current?.home_sector || "",
  bio: current?.bio || member?.notes || "",
  signature: current?.signature || "",
});

const safeList = async (entityName, sort = "-created_date", limit = 300) => {
  const entity = base44?.entities?.[entityName];
  if (!entity?.list) return [];
  try {
    const rows = await entity.list(sort, limit);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

export default function PresenceConsole({ member, user, isEditable }) {
  const [draft, setDraft] = useState(() => defaultDraft(member));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const presenceQuery = useRealtimeEntityList({
    queryKey: ["profile", "presence", member?.id || "none"],
    entityName: "PlayerPresence",
    queryFn: () => safeList("PlayerPresence", "-updated_date", 300),
    enabled: Boolean(member?.id),
    staleAfterMs: 20_000,
    patchStrategy: "patch",
  });
  const telemetryQuery = useRealtimeEntityList({
    queryKey: ["profile", "presence", "telemetry", member?.callsign || "none"],
    entityName: "PlayerLocation",
    queryFn: () => safeList("PlayerLocation", "-timestamp", 500),
    enabled: Boolean(member?.callsign),
    staleAfterMs: 15_000,
    patchStrategy: "patch",
  });

  const presenceRows = Array.isArray(presenceQuery.data) ? presenceQuery.data : [];
  const telemetryRows = Array.isArray(telemetryQuery.data) ? telemetryQuery.data : [];

  const currentPresence = useMemo(() => {
    if (!member) return null;
    return presenceRows
      .filter((row) => row.target_member_id === member.id
        || (member.user_email && row.user_email === member.user_email)
        || row.player_callsign === member.callsign)
      .sort(newestFirst)[0] || null;
  }, [member, presenceRows]);

  const lastTelemetry = useMemo(() => {
    if (!member?.callsign) return null;
    return telemetryRows.filter((row) => row.player_callsign === member.callsign).sort(newestFirst)[0] || null;
  }, [member?.callsign, telemetryRows]);

  const freshness = telemetryBucket(lastTelemetry?.timestamp);

  useEffect(() => {
    setDraft(defaultDraft(member, currentPresence));
  }, [currentPresence?.id, member?.id]);

  const handleSave = async () => {
    if (!member || !isEditable || busy) return;
    setBusy(true);
    setError("");
    try {
      const entity = base44?.entities?.PlayerPresence;
      if (!entity?.create) {
        throw new Error("PlayerPresence entity unavailable.");
      }
      const payload = {
        ...draft,
        target_member_id: member.id,
        player_callsign: member.callsign,
        user_email: member.user_email || null,
        updated_by: user?.email || null,
        updated_at: new Date().toISOString(),
      };
      if (currentPresence?.id && entity.update) {
        await entity.update(currentPresence.id, payload);
      } else {
        await entity.create(payload);
      }
      await presenceQuery.refetch?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save presence.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="LIVE PRESENCE CONSOLE" titleColor={T.cyan} headerRight={<Radio size={11} style={{ color: T.cyan }} />}>
      <div className="p-3 space-y-3">
        <LiveStatusStrip
          label="PRESENCE FEED"
          source={presenceQuery.source}
          retrievedAt={presenceQuery.retrievedAt}
          staleAfterMs={20_000}
          loading={presenceQuery.isLoading || presenceQuery.isFetching || busy}
          error={error || presenceQuery.error?.message || null}
          onRetry={() => presenceQuery.refetch?.()}
          extraBadges={[
            { label: `TELEMETRY ${freshness.toUpperCase()}`, color: freshness === "fresh" ? T.green : (freshness === "delayed" ? T.amber : T.red) },
            { label: `LAST ${lastTelemetry?.timestamp ? new Date(lastTelemetry.timestamp).toLocaleTimeString() : "N/A"}`, color: T.textDim },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="STATUS">
            <select className="w-full text-xs px-2 py-1.5 border outline-none" style={{ borderColor: T.borderHi, background: "rgba(10,7,4,0.95)", color: T.text }} value={draft.status} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}>
              {PRESENCE_STATUSES.map((status) => <option key={status} value={status}>{status.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="MOOD">
            <select className="w-full text-xs px-2 py-1.5 border outline-none" style={{ borderColor: T.borderHi, background: "rgba(10,7,4,0.95)", color: T.text }} value={draft.mood} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, mood: event.target.value }))}>
              {PRESENCE_MOODS.map((mood) => <option key={mood} value={mood}>{mood.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="OBJECTIVE">
            <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.objective} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, objective: event.target.value }))} />
          </Field>
          <Field label="SQUAD">
            <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.squad} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, squad: event.target.value }))} />
          </Field>
          <Field label="VOICE CH">
            <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.voice_channel} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, voice_channel: event.target.value }))} />
          </Field>
          <Field label="SECTOR">
            <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.home_sector} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, home_sector: event.target.value }))} />
          </Field>
        </div>

        <Field label="BIO">
          <textarea rows={2} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.bio} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))} />
        </Field>
        <Field label="SIGNATURE">
          <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.signature} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, signature: event.target.value }))} />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs" style={{ color: T.textFaint }}>
            {currentPresence?.updated_at ? `Updated ${new Date(currentPresence.updated_at).toLocaleString()}` : "No presence record yet."}
          </div>
          {isEditable
            ? (
              <ActionBtn color={T.cyan} onClick={handleSave} disabled={busy}>
                <Save size={10} /> {busy ? "SAVING..." : "SAVE"}
              </ActionBtn>
            )
            : <span className="text-xs" style={{ color: T.amber }}>LOCKED</span>}
        </div>
      </div>
    </Panel>
  );
}
