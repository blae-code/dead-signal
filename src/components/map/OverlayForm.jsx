import { useState } from "react";
import { T, FormPanel, Field, ActionBtn, inputStyle } from "@/components/ui/TerminalCard";
import { Layers } from "lucide-react";

const DEFAULT_OVERLAY = {
  title: "Danger Overlay",
  color: "#ff2020",
  opacity: 0.3,
  radius: 12,
};

export default function OverlayForm({ point, onSave, onClose }) {
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY);

  const save = () => {
    const title = typeof overlay.title === "string" ? overlay.title.trim() : "";
    if (!title) return;
    const radius = Number(overlay.radius);
    const opacity = Number(overlay.opacity);
    onSave?.({
      title,
      color: typeof overlay.color === "string" && overlay.color.trim() ? overlay.color.trim() : DEFAULT_OVERLAY.color,
      radius: Number.isFinite(radius) ? Math.max(1, Math.min(100, radius)) : DEFAULT_OVERLAY.radius,
      opacity: Number.isFinite(opacity) ? Math.max(0.05, Math.min(0.95, opacity)) : DEFAULT_OVERLAY.opacity,
      center: point,
    });
  };

  return (
    <FormPanel title="TACTICAL OVERLAY" titleColor={T.orange} onClose={onClose}>
      <p className="text-xs" style={{ color: T.textFaint }}>
        Create a shared tactical zone at X{Number(point?.normalized_x ?? point?.x ?? 0).toFixed(1)} Y{Number(point?.normalized_y ?? point?.y ?? 0).toFixed(1)}.
      </p>
      <Field label="TITLE">
        <input
          className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
          style={inputStyle}
          value={overlay.title}
          onChange={(event) => setOverlay((prev) => ({ ...prev, title: event.target.value }))}
          maxLength={40}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="COLOR">
          <input
            className="w-full h-8 px-1 border bg-transparent outline-none"
            style={inputStyle}
            type="color"
            value={overlay.color}
            onChange={(event) => setOverlay((prev) => ({ ...prev, color: event.target.value }))}
          />
        </Field>
        <Field label="RADIUS">
          <input
            className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
            style={inputStyle}
            type="number"
            min={1}
            max={100}
            value={overlay.radius}
            onChange={(event) => setOverlay((prev) => ({ ...prev, radius: event.target.value }))}
          />
        </Field>
      </div>
      <Field label="OPACITY">
        <input
          className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
          style={inputStyle}
          type="number"
          min={0.05}
          max={0.95}
          step={0.05}
          value={overlay.opacity}
          onChange={(event) => setOverlay((prev) => ({ ...prev, opacity: event.target.value }))}
        />
      </Field>
      <ActionBtn color={T.orange} onClick={save}>
        <Layers size={10} /> SAVE OVERLAY
      </ActionBtn>
    </FormPanel>
  );
}
