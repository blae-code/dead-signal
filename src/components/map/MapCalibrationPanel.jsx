import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { T, Panel, ActionBtn, Field, inputStyle } from "@/components/ui/TerminalCard";

const toNumberOrEmpty = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

const newControlPoint = () => ({
  id: crypto.randomUUID(),
  image_x: "",
  image_y: "",
  world_x: "",
  world_y: "",
});

export default function MapCalibrationPanel({ initialConfig, onSaved, isAdmin }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(initialConfig?.image_url || "");
  const [tileTemplateUrl, setTileTemplateUrl] = useState(initialConfig?.tile_url_template || "");
  const [imageWidth, setImageWidth] = useState(toNumberOrEmpty(initialConfig?.image_width_px));
  const [imageHeight, setImageHeight] = useState(toNumberOrEmpty(initialConfig?.image_height_px));
  const [minZoom, setMinZoom] = useState(toNumberOrEmpty(initialConfig?.min_zoom ?? 1));
  const [maxZoom, setMaxZoom] = useState(toNumberOrEmpty(initialConfig?.max_zoom ?? 4));
  const [defaultZoom, setDefaultZoom] = useState(toNumberOrEmpty(initialConfig?.default_zoom ?? 1));
  const [bounds, setBounds] = useState({
    min_x: toNumberOrEmpty(initialConfig?.world_bounds?.min_x),
    max_x: toNumberOrEmpty(initialConfig?.world_bounds?.max_x),
    min_y: toNumberOrEmpty(initialConfig?.world_bounds?.min_y),
    max_y: toNumberOrEmpty(initialConfig?.world_bounds?.max_y),
  });
  const [controlPoints, setControlPoints] = useState(() => {
    const incoming = Array.isArray(initialConfig?.control_points) ? initialConfig.control_points : [];
    if (incoming.length > 0) {
      return incoming.map((entry) => ({
        id: entry.id || crypto.randomUUID(),
        image_x: toNumberOrEmpty(entry?.image?.x),
        image_y: toNumberOrEmpty(entry?.image?.y),
        world_x: toNumberOrEmpty(entry?.world?.x),
        world_y: toNumberOrEmpty(entry?.world?.y),
      }));
    }
    return [newControlPoint(), newControlPoint()];
  });

  const canSave = useMemo(() => (
    isAdmin
    && (imageUrl.trim() || tileTemplateUrl.trim())
    && (tileTemplateUrl.trim() || (Number.isFinite(Number(imageWidth)) && Number.isFinite(Number(imageHeight))))
    && controlPoints.length >= 2
  ), [controlPoints.length, imageHeight, imageUrl, imageWidth, isAdmin, tileTemplateUrl]);

  const updateControlPoint = (id, key, value) => {
    setControlPoints((prev) => prev.map((point) => (point.id === id ? { ...point, [key]: value } : point)));
  };

  useEffect(() => {
    if (!initialConfig || typeof initialConfig !== "object") return;
    setImageUrl(initialConfig.image_url || "");
    setTileTemplateUrl(initialConfig.tile_url_template || "");
    setImageWidth(toNumberOrEmpty(initialConfig.image_width_px));
    setImageHeight(toNumberOrEmpty(initialConfig.image_height_px));
    setMinZoom(toNumberOrEmpty(initialConfig.min_zoom ?? 1));
    setMaxZoom(toNumberOrEmpty(initialConfig.max_zoom ?? 4));
    setDefaultZoom(toNumberOrEmpty(initialConfig.default_zoom ?? 1));
    setBounds({
      min_x: toNumberOrEmpty(initialConfig.world_bounds?.min_x),
      max_x: toNumberOrEmpty(initialConfig.world_bounds?.max_x),
      min_y: toNumberOrEmpty(initialConfig.world_bounds?.min_y),
      max_y: toNumberOrEmpty(initialConfig.world_bounds?.max_y),
    });
    const incoming = Array.isArray(initialConfig.control_points) ? initialConfig.control_points : [];
    if (incoming.length > 0) {
      setControlPoints(incoming.map((entry) => ({
        id: entry.id || crypto.randomUUID(),
        image_x: toNumberOrEmpty(entry?.image?.x),
        image_y: toNumberOrEmpty(entry?.image?.y),
        world_x: toNumberOrEmpty(entry?.world?.x),
        world_y: toNumberOrEmpty(entry?.world?.y),
      })));
    }
  }, [initialConfig]);

  const addPoint = () => setControlPoints((prev) => [...prev, newControlPoint()]);
  const removePoint = (id) => setControlPoints((prev) => (prev.length <= 2 ? prev : prev.filter((point) => point.id !== id)));

  const saveConfig = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        config: {
          map_id: "global-map",
          image_url: imageUrl.trim() || null,
          tile_url_template: tileTemplateUrl.trim() || null,
          image_width_px: Number.isFinite(Number(imageWidth)) ? Number(imageWidth) : null,
          image_height_px: Number.isFinite(Number(imageHeight)) ? Number(imageHeight) : null,
          min_zoom: Number.isFinite(Number(minZoom)) ? Number(minZoom) : 1,
          max_zoom: Number.isFinite(Number(maxZoom)) ? Number(maxZoom) : 4,
          default_zoom: Number.isFinite(Number(defaultZoom)) ? Number(defaultZoom) : 1,
          world_bounds: {
            min_x: Number(bounds.min_x),
            max_x: Number(bounds.max_x),
            min_y: Number(bounds.min_y),
            max_y: Number(bounds.max_y),
          },
          control_points: controlPoints.map((point) => ({
            id: point.id,
            image: { x: Number(point.image_x), y: Number(point.image_y) },
            world: { x: Number(point.world_x), y: Number(point.world_y) },
          })),
        },
      };
      const response = await base44.functions.invoke("setMapRuntimeConfig", payload);
      if (!response?.data?.success) {
        throw new Error(response?.data?.error || "Failed to save map config.");
      }
      onSaved?.(response.data.config);
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="MAP CALIBRATION" titleColor={T.cyan}>
      <div className="p-3 space-y-2">
        <Field label="MAP IMAGE URL">
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
            style={inputStyle}
            placeholder="https://..."
            disabled={!isAdmin}
          />
        </Field>
        <Field label="TILE URL TEMPLATE (OPTIONAL)">
          <input
            value={tileTemplateUrl}
            onChange={(event) => setTileTemplateUrl(event.target.value)}
            className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
            style={inputStyle}
            placeholder="https://tileserver/{z}/{x}/{y}.png"
            disabled={!isAdmin}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="IMAGE WIDTH PX">
            <input
              value={imageWidth}
              onChange={(event) => setImageWidth(event.target.value)}
              className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={inputStyle}
              type="number"
              disabled={!isAdmin}
            />
          </Field>
          <Field label="IMAGE HEIGHT PX">
            <input
              value={imageHeight}
              onChange={(event) => setImageHeight(event.target.value)}
              className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={inputStyle}
              type="number"
              disabled={!isAdmin}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="MIN ZOOM">
            <input
              value={minZoom}
              onChange={(event) => setMinZoom(event.target.value)}
              className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={inputStyle}
              type="number"
              disabled={!isAdmin}
            />
          </Field>
          <Field label="MAX ZOOM">
            <input
              value={maxZoom}
              onChange={(event) => setMaxZoom(event.target.value)}
              className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={inputStyle}
              type="number"
              disabled={!isAdmin}
            />
          </Field>
          <Field label="DEFAULT ZOOM">
            <input
              value={defaultZoom}
              onChange={(event) => setDefaultZoom(event.target.value)}
              className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={inputStyle}
              type="number"
              disabled={!isAdmin}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="WORLD MIN X">
            <input value={bounds.min_x} onChange={(event) => setBounds((prev) => ({ ...prev, min_x: event.target.value }))} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
          </Field>
          <Field label="WORLD MAX X">
            <input value={bounds.max_x} onChange={(event) => setBounds((prev) => ({ ...prev, max_x: event.target.value }))} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
          </Field>
          <Field label="WORLD MIN Y">
            <input value={bounds.min_y} onChange={(event) => setBounds((prev) => ({ ...prev, min_y: event.target.value }))} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
          </Field>
          <Field label="WORLD MAX Y">
            <input value={bounds.max_y} onChange={(event) => setBounds((prev) => ({ ...prev, max_y: event.target.value }))} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
          </Field>
        </div>

        <div className="border p-2 space-y-2" style={{ borderColor: T.border }}>
          <div className="flex items-center justify-between">
            <span style={{ color: T.textDim, fontSize: "10px", letterSpacing: "0.1em" }}>CONTROL POINTS</span>
            {isAdmin && <ActionBtn color={T.cyan} onClick={addPoint} small>ADD POINT</ActionBtn>}
          </div>
          {controlPoints.map((point, index) => (
            <div key={point.id} className="grid grid-cols-2 gap-2 border p-2" style={{ borderColor: T.border + "66" }}>
              <Field label={`P${index + 1} IMAGE X`}>
                <input value={point.image_x} onChange={(event) => updateControlPoint(point.id, "image_x", event.target.value)} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
              </Field>
              <Field label={`P${index + 1} IMAGE Y`}>
                <input value={point.image_y} onChange={(event) => updateControlPoint(point.id, "image_y", event.target.value)} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
              </Field>
              <Field label={`P${index + 1} WORLD X`}>
                <input value={point.world_x} onChange={(event) => updateControlPoint(point.id, "world_x", event.target.value)} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
              </Field>
              <Field label={`P${index + 1} WORLD Y`}>
                <input value={point.world_y} onChange={(event) => updateControlPoint(point.id, "world_y", event.target.value)} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle} type="number" disabled={!isAdmin} />
              </Field>
              {isAdmin && (
                <div className="col-span-2">
                  <ActionBtn color={T.red} onClick={() => removePoint(point.id)} small disabled={controlPoints.length <= 2}>
                    REMOVE POINT
                  </ActionBtn>
                </div>
              )}
            </div>
          ))}
        </div>

        {!isAdmin && (
          <div className="border px-2 py-1 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
            LOCKED: admin role required to update map calibration.
          </div>
        )}
        {error && (
          <div className="border px-2 py-1 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
            {error}
          </div>
        )}
        <ActionBtn color={T.green} onClick={saveConfig} disabled={!canSave || saving}>
          {saving ? "SAVING..." : "SAVE MAP CONFIG"}
        </ActionBtn>
      </div>
    </Panel>
  );
}
