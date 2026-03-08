import { Lock } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

export default function PermissionGate({
  allowed,
  message = "This action requires elevated permissions.",
  children,
}) {
  if (allowed) {
    return children;
  }

  return (
    <div
      className="border px-3 py-3"
      style={{
        borderColor: T.border,
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-2" style={{ color: T.amber, fontSize: "10px", letterSpacing: "0.08em" }}>
        <Lock size={11} />
        LOCKED
      </div>
      <div style={{ color: T.textDim, fontSize: "10px", marginTop: "4px" }}>{message}</div>
    </div>
  );
}
