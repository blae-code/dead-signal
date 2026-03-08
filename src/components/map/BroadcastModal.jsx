import { useState } from "react";
import { T, FormPanel, Field, ActionBtn, inputStyle } from "@/components/ui/TerminalCard";
import { Megaphone } from "lucide-react";

export default function BroadcastModal({ onSend, onClose }) {
  const [msg, setMsg] = useState("");
  const [x, setX] = useState("50");
  const [y, setY] = useState("50");

  const handleSend = () => {
    if (!msg.trim()) return;
    onSend(msg.trim(), parseFloat(x), parseFloat(y));
  };

  return (
    <FormPanel title="BROADCAST MESSAGE" titleColor="#ff00ff" onClose={onClose}>
      <p className="text-xs" style={{ color: T.textFaint }}>
        Message will flash on ALL viewers' maps for 30 seconds.
      </p>
      <Field label="MESSAGE">
        <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ ...inputStyle, borderColor: "#ff00ff55" }}
          placeholder="e.g. REGROUP AT ALPHA" value={msg} onChange={e => setMsg(e.target.value.toUpperCase())} maxLength={40} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="MAP X (0-100)">
          <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
            value={x} onChange={e => setX(e.target.value)} min={0} max={100} />
        </Field>
        <Field label="MAP Y (0-100)">
          <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
            value={y} onChange={e => setY(e.target.value)} min={0} max={100} />
        </Field>
      </div>
      <ActionBtn color="#ff00ff" onClick={handleSend}>
        <Megaphone size={10} /> SEND BROADCAST
      </ActionBtn>
    </FormPanel>
  );
}