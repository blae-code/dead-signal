import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { NotebookPen, Save, Trash2 } from "lucide-react";
import { ActionBtn, Field, Panel, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import LiveStatusStrip from "@/components/live/LiveStatusStrip";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "PRIVATE" },
  { value: "officers", label: "OFFICERS" },
  { value: "clan", label: "CLAN" },
];

const parseTs = (value) => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (a, b) => {
  const left = parseTs(a?.updated_at || a?.updated_date || a?.created_date || a?.timestamp);
  const right = parseTs(b?.updated_at || b?.updated_date || b?.created_date || b?.timestamp);
  return right - left;
};

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

const emptyDraft = () => ({
  title: "",
  visibility: "clan",
  tags: "",
  body: "",
});

export default function FieldJournal({
  member,
  user,
  myCallsign,
  isEditable,
  canViewOfficerNotes,
}) {
  const [draft, setDraft] = useState(() => emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const journalQuery = useRealtimeEntityList({
    queryKey: ["profile", "journal", member?.id || "none"],
    entityName: "PlayerFieldJournal",
    queryFn: () => safeList("PlayerFieldJournal", "-created_date", 400),
    enabled: Boolean(member?.id),
    staleAfterMs: 30_000,
    patchStrategy: "patch",
  });

  const rows = Array.isArray(journalQuery.data) ? journalQuery.data : [];
  const memberJournal = useMemo(() => {
    if (!member) return [];
    return rows
      .filter((row) => row.target_member_id === member.id
        || (member.user_email && row.user_email === member.user_email)
        || row.player_callsign === member.callsign)
      .sort(newestFirst);
  }, [member, rows]);

  const visibleEntries = useMemo(() => memberJournal.filter((entry) => {
    if (entry.visibility === "private") {
      return isEditable || entry.author_email === user?.email;
    }
    if (entry.visibility === "officers") {
      return isEditable || canViewOfficerNotes;
    }
    return true;
  }), [canViewOfficerNotes, isEditable, memberJournal, user?.email]);

  const handleSave = async () => {
    if (!member || !isEditable || busy) return;
    if (!draft.title.trim() || !draft.body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const entity = base44?.entities?.PlayerFieldJournal;
      if (!entity?.create) throw new Error("PlayerFieldJournal entity unavailable.");
      const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      await entity.create({
        target_member_id: member.id,
        player_callsign: member.callsign,
        user_email: member.user_email || null,
        title: draft.title.trim(),
        body: draft.body.trim(),
        visibility: draft.visibility,
        tags,
        author_email: user?.email || null,
        author_callsign: myCallsign || user?.full_name || user?.email || "Operator",
        created_at: new Date().toISOString(),
      });
      setDraft(emptyDraft());
      await journalQuery.refetch?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save journal entry.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!entry?.id || busy) return;
    const canDelete = isEditable || entry.author_email === user?.email;
    if (!canDelete) return;
    setBusy(true);
    setError("");
    try {
      const entity = base44?.entities?.PlayerFieldJournal;
      if (!entity?.delete) throw new Error("PlayerFieldJournal delete unavailable.");
      await entity.delete(entry.id);
      await journalQuery.refetch?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete journal entry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="FIELD JOURNAL" titleColor={T.green} headerRight={<NotebookPen size={11} style={{ color: T.green }} />}>
      <div className="p-3 space-y-3">
        <LiveStatusStrip
          label="JOURNAL FEED"
          source={journalQuery.source}
          retrievedAt={journalQuery.retrievedAt}
          staleAfterMs={30_000}
          loading={journalQuery.isLoading || journalQuery.isFetching || busy}
          error={error || journalQuery.error?.message || null}
          onRetry={() => journalQuery.refetch?.()}
          extraBadges={[
            { label: `VISIBLE ${visibleEntries.length}`, color: T.green },
            { label: `TOTAL ${memberJournal.length}`, color: T.textDim },
          ]}
        />

        {isEditable && (
          <div className="border p-3 space-y-2" style={{ borderColor: T.green + "44", background: T.green + "08" }}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="TITLE">
                <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
              </Field>
              <Field label="VISIBILITY">
                <select className="w-full text-xs px-2 py-1.5 border outline-none" style={{ borderColor: T.borderHi, background: "rgba(10,7,4,0.95)", color: T.text }} value={draft.visibility} onChange={(event) => setDraft((prev) => ({ ...prev, visibility: event.target.value }))}>
                  {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="TAGS (comma-separated)">
              <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.tags} onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))} placeholder="raid, route, resource" />
            </Field>
            <Field label="ENTRY">
              <textarea rows={4} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.body} onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))} />
            </Field>
            <div className="flex justify-end">
              <ActionBtn color={T.green} onClick={handleSave} disabled={busy || !draft.title.trim() || !draft.body.trim()}>
                <Save size={10} /> {busy ? "SAVING..." : "SAVE ENTRY"}
              </ActionBtn>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {visibleEntries.length === 0 ? (
            <div className="px-3 py-8 text-center" style={{ color: T.textGhost, fontSize: "9px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>
              // NO JOURNAL ENTRIES
            </div>
          ) : (
            visibleEntries.map((entry) => {
              const canDelete = isEditable || entry.author_email === user?.email;
              return (
                <div key={entry.id} className="border p-2" style={{ borderColor: T.border, background: "rgba(0,0,0,0.2)" }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs" style={{ color: T.text }}>{entry.title}</div>
                      <div className="text-xs mt-1" style={{ color: T.textDim, lineHeight: 1.5 }}>{entry.body}</div>
                      <div className="text-xs mt-2 flex items-center gap-2 flex-wrap" style={{ color: T.textFaint, fontSize: "9px" }}>
                        <span>{entry.author_callsign || entry.author_email || "Unknown"}</span>
                        <span>·</span>
                        <span>{entry.created_at ? new Date(entry.created_at).toLocaleString() : "unknown time"}</span>
                        <span>·</span>
                        <span>{String(entry.visibility || "clan").toUpperCase()}</span>
                        {Array.isArray(entry.tags) && entry.tags.map((tag) => (
                          <span key={`${entry.id}-${tag}`} className="px-1.5 py-0.5 border" style={{ borderColor: T.borderHi }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    {canDelete && (
                      <button type="button" className="border px-2 py-1" style={{ borderColor: T.red + "66", color: T.red, fontSize: "9px" }} onClick={() => handleDelete(entry)}>
                        <Trash2 size={9} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Panel>
  );
}
