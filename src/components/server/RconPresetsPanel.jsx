import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, Trash2, Send, Wand2, ChevronDown } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

export default function RconPresetsPanel({ status, events, onCommandSend, cmdLoading }) {
  const [presets, setPresets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [suggestedCommands, setSuggestedCommands] = useState([]);
  const [expandedPreset, setExpandedPreset] = useState(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [formData, setFormData] = useState({ label: "", command: "", description: "", category: "Custom", parameters: [] });
  const [paramInput, setParamInput] = useState({ name: "", placeholder: "", defaultValue: "" });

  // Fetch presets
  useEffect(() => {
    base44.entities.RconPreset.list("-created_date", 50)
      .then(setPresets)
      .catch(() => {});
  }, []);

  // Generate AI suggestions
  const handleGenerateSuggestions = async () => {
    setLoadingSuggest(true);
    try {
      const res = await base44.functions.invoke("suggestRconCommands", {
        serverStatus: status,
        recentEvents: events.slice(0, 10),
      });
      setSuggestedCommands(res.data?.commands || []);
    } catch (err) {
      console.error("Failed to generate suggestions:", err);
    } finally {
      setLoadingSuggest(false);
    }
  };

  // Save preset
  const handleSavePreset = async () => {
    if (!formData.label || !formData.command) return;
    try {
      if (editingId) {
        await base44.entities.RconPreset.update(editingId, formData);
        setPresets(p => p.map(x => x.id === editingId ? { ...x, ...formData } : x));
      } else {
        const created = await base44.entities.RconPreset.create(formData);
        setPresets(p => [created, ...p]);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ label: "", command: "", description: "", category: "Custom", parameters: [] });
    } catch (err) {
      console.error("Error saving preset:", err);
    }
  };

  // Delete preset
  const handleDeletePreset = async (id) => {
    try {
      await base44.entities.RconPreset.delete(id);
      setPresets(p => p.filter(x => x.id !== id));
    } catch (err) {
      console.error("Error deleting preset:", err);
    }
  };

  // Execute preset with parameters
  const executePreset = (preset) => {
    if (!preset.parameters || preset.parameters.length === 0) {
      onCommandSend(preset.command);
      return;
    }
    // Collect parameter values from form inputs
    const inputs = document.querySelectorAll(`[data-param-${preset.id}]`);
    let cmd = preset.command;
    inputs.forEach(input => {
      const paramName = input.dataset.paramName;
      cmd = cmd.replace(`{${paramName}}`, input.value || "");
    });
    onCommandSend(cmd);
  };

  // Add parameter to form
  const addParameter = () => {
    if (paramInput.name) {
      setFormData(p => ({
        ...p,
        parameters: [...(p.parameters || []), { ...paramInput }],
      }));
      setParamInput({ name: "", placeholder: "", defaultValue: "" });
    }
  };

  // Remove parameter from form
  const removeParameter = (idx) => {
    setFormData(p => ({
      ...p,
      parameters: p.parameters.filter((_, i) => i !== idx),
    }));
  };

  const categoryColors = {
    Moderation: T.red,
    Server: T.cyan,
    Performance: T.orange,
    Communication: T.green,
    Custom: T.gold,
  };

  return (
    <div className="space-y-3">
      {/* ── PRESETS HEADER ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden p-3 border flex items-center justify-between"
        style={{ borderColor: T.border, background: `${T.gold}08` }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.gold}44, transparent)` }} />
        <div className="flex items-center gap-2">
          <Zap size={10} style={{ color: T.gold }} />
          <span style={{ color: T.gold, fontFamily: "'Orbitron', monospace", fontSize: "9.5px", letterSpacing: "0.2em", textShadow: `0 0 8px ${T.gold}55` }}>
            RCON PRESETS
          </span>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="flex items-center gap-1 px-2 py-1 border hover:opacity-80 transition-opacity"
          style={{ borderColor: T.border, color: T.textDim, fontSize: "7px" }}
        >
          <Plus size={9} />
          NEW
        </button>
      </div>

      {/* ── NEW PRESET FORM ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 border border-t-0" style={{ borderColor: T.border, background: `${T.green}05` }}>
              <div>
                <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "2px" }}>LABEL</div>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g. Kick AFK Players"
                  style={{ width: "100%", ...T.inputStyle }}
                  className="border p-1.5 text-xs"
                />
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "2px" }}>COMMAND</div>
                <textarea
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="kick {player}"
                  style={{ width: "100%", ...T.inputStyle, height: "50px" }}
                  className="border p-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "2px" }}>DESCRIPTION</div>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  style={{ width: "100%", ...T.inputStyle }}
                  className="border p-1.5 text-xs"
                />
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "2px" }}>CATEGORY</div>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: "100%", ...T.selectStyle }}
                  className="border p-1.5 text-xs"
                >
                  <option value="Moderation">Moderation</option>
                  <option value="Server">Server</option>
                  <option value="Performance">Performance</option>
                  <option value="Communication">Communication</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Parameters */}
              {formData.parameters && formData.parameters.length > 0 && (
                <div className="pt-2 border-t" style={{ borderColor: T.border + "55" }}>
                  <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "2px" }}>PARAMETERS</div>
                  <div className="space-y-1.5">
                    {formData.parameters.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="flex-1 text-xs" style={{ color: T.textDim }}>
                          {"{" + p.name + "}"} - {p.placeholder}
                        </div>
                        <button
                          onClick={() => removeParameter(i)}
                          className="p-0.5 hover:opacity-70"
                          style={{ color: T.red }}
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add parameter */}
              <div className="pt-2 border-t" style={{ borderColor: T.border + "55" }}>
                <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "2px" }}>ADD PARAMETER</div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={paramInput.name}
                    onChange={(e) => setParamInput({ ...paramInput, name: e.target.value })}
                    placeholder="Name"
                    style={{ flex: 1, ...T.inputStyle }}
                    className="border p-1 text-xs"
                  />
                  <button
                    onClick={addParameter}
                    className="px-2 py-1 border hover:opacity-80"
                    style={{ borderColor: T.border, color: T.green, fontSize: "9px" }}
                  >
                    ADD
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 pt-2">
                <button
                  onClick={handleSavePreset}
                  className="flex-1 px-2 py-1.5 border text-xs font-mono hover:opacity-80"
                  style={{ borderColor: T.green, color: T.green }}
                >
                  {editingId ? "UPDATE" : "SAVE"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 px-2 py-1.5 border text-xs font-mono hover:opacity-80"
                  style={{ borderColor: T.border, color: T.textFaint }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRESETS LIST ─────────────────────────────────────────────── */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {presets.length === 0 ? (
          <div style={{ color: T.textGhost, fontSize: "8px", padding: "12px", textAlign: "center" }}>
            // NO PRESETS — CREATE ONE TO GET STARTED
          </div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="overflow-hidden border" style={{ borderColor: T.border, background: "rgba(0,0,0,0.3)" }}>
              <button
                onClick={() => setExpandedPreset(expandedPreset === preset.id ? null : preset.id)}
                className="w-full flex items-center gap-2 p-2 hover:opacity-80 transition-opacity"
              >
                <ChevronDown size={8} style={{ color: categoryColors[preset.category], transform: expandedPreset === preset.id ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-xs font-mono" style={{ color: categoryColors[preset.category] }}>
                    {preset.label}
                  </div>
                  {preset.description && (
                    <div className="text-6px" style={{ color: T.textFaint, marginTop: "2px" }}>
                      {preset.description}
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expandedPreset === preset.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t"
                    style={{ borderColor: T.border }}
                  >
                    <div className="p-2 space-y-2" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <div className="p-1.5 border text-xs font-mono" style={{ borderColor: T.border, background: "rgba(0,0,0,0.7)", color: T.cyan, wordBreak: "break-all" }}>
                        {preset.command}
                      </div>

                      {/* Parameter inputs */}
                      {preset.parameters && preset.parameters.length > 0 && (
                        <div className="space-y-1">
                          {preset.parameters.map((param, idx) => (
                            <div key={idx}>
                              <div style={{ color: T.textFaint, fontSize: "7px", marginBottom: "1px" }}>
                                {param.name}
                              </div>
                              <input
                                type="text"
                                placeholder={param.placeholder || param.name}
                                defaultValue={param.defaultValue || ""}
                                data-param-id={preset.id}
                                data-param-name={param.name}
                                style={{ width: "100%", ...T.inputStyle }}
                                className="border p-1 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() => executePreset(preset)}
                          disabled={cmdLoading}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border text-xs font-mono hover:opacity-80 transition-opacity disabled:opacity-50"
                          style={{ borderColor: T.green, color: T.green }}
                        >
                          <Send size={8} />
                          EXEC
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(preset.id);
                            setFormData(preset);
                            setShowForm(true);
                          }}
                          className="flex-1 px-2 py-1.5 border text-xs font-mono hover:opacity-80"
                          style={{ borderColor: T.border, color: T.textDim }}
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="px-2 py-1.5 border text-xs font-mono hover:opacity-80"
                          style={{ borderColor: T.red, color: T.red }}
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* ── AI SUGGESTIONS ───────────────────────────────────────────── */}
      <button
        onClick={handleGenerateSuggestions}
        disabled={loadingSuggest}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 border hover:opacity-80 transition-opacity disabled:opacity-50"
        style={{ borderColor: T.cyan, color: T.cyan, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em" }}
      >
        <Wand2 size={10} />
        {loadingSuggest ? "ANALYZING..." : "AI SUGGESTIONS"}
      </button>

      <AnimatePresence>
        {suggestedCommands.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-1"
          >
            <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", padding: "0 3px" }}>
              SUGGESTED COMMANDS
            </div>
            {suggestedCommands.map((cmd, i) => (
              <div key={i} className="border p-2" style={{ borderColor: T.cyan + "33", background: `${T.cyan}08` }}>
                <div className="text-xs font-mono mb-1" style={{ color: T.cyan, wordBreak: "break-all" }}>
                  {cmd.command}
                </div>
                {cmd.reason && (
                  <div className="text-6px mb-2" style={{ color: T.textFaint }}>
                    {cmd.reason}
                  </div>
                )}
                <button
                  onClick={() => onCommandSend(cmd.command)}
                  disabled={cmdLoading}
                  className="w-full px-2 py-1 border text-xs font-mono hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: T.green, color: T.green }}
                >
                  RUN
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}