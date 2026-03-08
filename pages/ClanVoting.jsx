import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Vote, Plus, CheckCircle, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const empty = { question: "", options: ["", ""], closes_at: "" };

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";

const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";

export default function ClanVoting() {
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const voteStatuses = runtimeConfig.getArray(["taxonomy", "clan_vote_statuses"]);
  const voteFilters = runtimeConfig.getArray(["taxonomy", "clan_vote_filters"]);
  const allFilter = useMemo(() => pickByToken(voteFilters, "all") || pickFirst(voteFilters), [voteFilters]);
  const openStatus = useMemo(() => pickByToken(voteStatuses, "open") || pickFirst(voteStatuses), [voteStatuses]);
  const closedStatus = useMemo(() => pickByToken(voteStatuses, "closed"), [voteStatuses]);

  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: user = null } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const isAdmin = user?.role === "admin";

  const { data: votes = [] } = useRealtimeEntityList({
    queryKey: ["clan-voting", "votes"],
    entityName: "ClanVote",
    queryFn: () => base44.entities.ClanVote.list("-created_date", 100),
    patchStrategy: "patch",
  });

  useEffect(() => {
    if (!filter && allFilter) setFilter(allFilter);
  }, [allFilter, filter]);

  const filtered = useMemo(() => {
    if (!filter || filter === allFilter) return votes;
    return votes.filter((vote) => vote.status === filter);
  }, [allFilter, filter, votes]);

  const handleSave = async () => {
    if (!user?.email) return;
    const entry = {
      question: form.question,
      options: form.options.filter((option) => option.trim()),
      votes: [],
      created_by: user.email,
      closes_at: form.closes_at || null,
    };
    if (openStatus) entry.status = openStatus;
    await base44.entities.ClanVote.create(entry);
    queryClient.invalidateQueries({ queryKey: ["clan-voting", "votes"] });
    setForm(empty);
    setShowForm(false);
  };

  const handleVote = async (poll, optionIdx) => {
    if (!user?.email) return;
    const existing = (poll.votes || []).find((vote) => vote.voter_email === user.email);
    if (existing) return;
    await base44.entities.ClanVote.update(poll.id, {
      votes: [...(poll.votes || []), { voter_email: user.email, option_index: optionIdx }],
    });
    queryClient.invalidateQueries({ queryKey: ["clan-voting", "votes"] });
  };

  const handleClose = async (poll) => {
    if (!closedStatus) return;
    await base44.entities.ClanVote.update(poll.id, { status: closedStatus });
    queryClient.invalidateQueries({ queryKey: ["clan-voting", "votes"] });
  };

  const handleDelete = async (id) => {
    await base44.entities.ClanVote.delete(id);
    queryClient.invalidateQueries({ queryKey: ["clan-voting", "votes"] });
  };

  const getResults = (poll) => {
    const counts = (poll.options || []).map((option, index) => ({
      option,
      count: (poll.votes || []).filter((vote) => vote.option_index === index).length,
    }));
    const total = counts.reduce((accumulator, item) => accumulator + item.count, 0);
    return { counts, total };
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <PageHeader icon={Vote} title="CLAN VOTING" color={T.green}>
        {isAdmin && (
          <ActionBtn color={T.green} onClick={() => setShowForm(!showForm)}>
            <Plus size={10} /> NEW VOTE
          </ActionBtn>
        )}
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      {showForm && isAdmin && (
        <FormPanel title="CREATE VOTE" titleColor={T.green} onClose={() => setShowForm(false)}>
          <Field label="QUESTION *">
            <input
              className="w-full border p-2 text-xs mb-3"
              style={{ borderColor: T.border, background: T.bg1, color: T.text }}
              value={form.question}
              onChange={(event) => setForm({ ...form, question: event.target.value })}
              placeholder="What are we voting on?"
            />
          </Field>
          <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: 6, letterSpacing: "0.1em" }}>// OPTIONS</div>
          {form.options.map((option, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                className="flex-1 border p-2 text-xs"
                style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={option}
                onChange={(event) => {
                  const next = [...form.options];
                  next[index] = event.target.value;
                  setForm({ ...form, options: next });
                }}
                placeholder={`Option ${index + 1}`}
              />
              {form.options.length > 2 && (
                <button
                  onClick={() => setForm({ ...form, options: form.options.filter((_, current) => current !== index) })}
                  style={{ color: T.red, fontSize: "16px" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {form.options.length < 6 && (
            <ActionBtn small color={T.textDim} onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
              + ADD OPTION
            </ActionBtn>
          )}
          <Field label="CLOSES AT (OPTIONAL)">
            <input
              type="datetime-local"
              className="w-full border p-2 text-xs mt-2"
              style={{ borderColor: T.border, background: T.bg1, color: T.text }}
              value={form.closes_at}
              onChange={(event) => setForm({ ...form, closes_at: event.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-3">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>
              CANCEL
            </ActionBtn>
            <ActionBtn color={T.green} onClick={handleSave} disabled={!form.question || form.options.filter((option) => option.trim()).length < 2}>
              CREATE VOTE
            </ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex gap-1">
        {voteFilters.map((item) => (
          <FilterPill key={item} label={item} active={filter === item} color={T.green} onClick={() => setFilter(item)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="NO VOTES — DEMOCRACY NEEDS YOU" />
      ) : (
        filtered.map((poll) => {
          const { counts, total } = getResults(poll);
          const myVote = (poll.votes || []).find((vote) => vote.voter_email === user?.email);
          const closedByStatus = closedStatus ? poll.status === closedStatus : false;
          const closedByTime = Boolean(poll.closes_at && new Date(poll.closes_at) < new Date());
          const isClosed = closedByStatus || closedByTime;

          return (
            <Panel key={poll.id} title={isClosed ? `[CLOSED] ${poll.question}` : poll.question} titleColor={isClosed ? T.textDim : T.green}>
              <div className="p-3 space-y-3">
                {counts.map((entry, index) => {
                  const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
                  const isMyVote = myVote?.option_index === index;
                  const leadingCount = Math.max(...counts.map((item) => item.count));
                  const isLeading = entry.count > 0 && entry.count === leadingCount;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => !isClosed && !myVote && handleVote(poll, index)}
                          className="flex items-center gap-2 text-left"
                          disabled={Boolean(myVote) || isClosed}
                          style={{ cursor: myVote || isClosed ? "default" : "pointer" }}
                        >
                          {isMyVote && <CheckCircle size={10} style={{ color: T.green }} />}
                          <span style={{ color: isMyVote ? T.green : T.text, fontSize: "12px" }}>{entry.option}</span>
                        </button>
                        <span style={{ color: isLeading ? T.green : T.textDim, fontSize: "11px", fontFamily: "'Orbitron', monospace" }}>
                          {entry.count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 4, background: T.border }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: isLeading ? T.green : T.cyan + "88", transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1">
                  <span style={{ color: T.textFaint, fontSize: "9px" }}>
                    {total} vote{total !== 1 ? "s" : ""} cast
                    {poll.closes_at && ` · closes ${new Date(poll.closes_at).toLocaleDateString()}`}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      {!isClosed && closedStatus && (
                        <ActionBtn small color={T.amber} onClick={() => handleClose(poll)}>
                          <Lock size={8} /> CLOSE
                        </ActionBtn>
                      )}
                      <ActionBtn small color={T.red + "aa"} onClick={() => handleDelete(poll.id)}>
                        DELETE
                      </ActionBtn>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          );
        })
      )}
    </div>
  );
}
