import { AppError } from "./backend.ts";

export const MAP_RUNTIME_CONFIG_KEY = "global";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPoint = (value: unknown): { x: number; y: number } | null => {
  if (!isRecord(value)) return null;
  const x = toNumber(value.x);
  const y = toNumber(value.y);
  if (x === null || y === null) return null;
  return { x, y };
};

const normalizeWorldBounds = (value: unknown): Record<string, number> | null => {
  if (!isRecord(value)) return null;
  const minX = toNumber(value.min_x);
  const maxX = toNumber(value.max_x);
  const minY = toNumber(value.min_y);
  const maxY = toNumber(value.max_y);
  if (minX === null || maxX === null || minY === null || maxY === null) {
    return null;
  }
  if (maxX <= minX || maxY <= minY) {
    throw new AppError(400, "invalid_world_bounds", "world_bounds max values must be greater than min values.");
  }
  return { min_x: minX, max_x: maxX, min_y: minY, max_y: maxY };
};

const normalizeControlPoint = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const image = toPoint(value.image);
  const world = toPoint(value.world);
  if (!image || !world) {
    return null;
  }
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : crypto.randomUUID(),
    image,
    world,
  };
};

const validateControlPoints = (
  points: Record<string, unknown>[],
  imageWidth: number | null,
  imageHeight: number | null,
): void => {
  const byId = new Set<string>();
  for (const point of points) {
    const id = typeof point.id === "string" ? point.id : "";
    if (id && byId.has(id)) {
      throw new AppError(400, "duplicate_control_point_id", `Duplicate control point id: ${id}`);
    }
    if (id) byId.add(id);
    const image = isRecord(point.image) ? point.image : null;
    if (!image) {
      throw new AppError(400, "invalid_control_point", "Each control point requires image coordinates.");
    }
    const ix = toNumber(image.x);
    const iy = toNumber(image.y);
    if (ix === null || iy === null) {
      throw new AppError(400, "invalid_control_point", "Control point image coordinates must be numbers.");
    }
    if (imageWidth !== null && (ix < 0 || ix > imageWidth)) {
      throw new AppError(400, "invalid_control_point", "Control point image.x is outside image bounds.");
    }
    if (imageHeight !== null && (iy < 0 || iy > imageHeight)) {
      throw new AppError(400, "invalid_control_point", "Control point image.y is outside image bounds.");
    }
  }
};

export const sanitizeMapRuntimeConfig = (raw: unknown): Record<string, unknown> => {
  if (!isRecord(raw)) {
    throw new AppError(400, "invalid_map_config", "Map config payload must be a JSON object.");
  }
  const imageUrl = typeof raw.image_url === "string" && raw.image_url.trim() ? raw.image_url.trim() : null;
  const imageWidth = toNumber(raw.image_width_px);
  const imageHeight = toNumber(raw.image_height_px);
  const worldBounds = normalizeWorldBounds(raw.world_bounds);
  const mapId = typeof raw.map_id === "string" && raw.map_id.trim() ? raw.map_id.trim() : "global-map";
  const controlPoints = Array.isArray(raw.control_points)
    ? raw.control_points.map(normalizeControlPoint).filter(Boolean) as Record<string, unknown>[]
    : [];
  const tileTemplateUrl = typeof raw.tile_url_template === "string" && raw.tile_url_template.trim()
    ? raw.tile_url_template.trim()
    : null;
  const maxZoom = toNumber(raw.max_zoom);
  const minZoom = toNumber(raw.min_zoom);
  const defaultZoom = toNumber(raw.default_zoom);

  const config: Record<string, unknown> = {
    map_id: mapId,
    image_url: imageUrl,
    image_width_px: imageWidth,
    image_height_px: imageHeight,
    world_bounds: worldBounds,
    control_points: controlPoints,
    tile_url_template: tileTemplateUrl,
    max_zoom: maxZoom ?? 4,
    min_zoom: minZoom ?? 1,
    default_zoom: defaultZoom ?? 1,
    updated_at: new Date().toISOString(),
  };

  if (!imageUrl && !tileTemplateUrl) {
    throw new AppError(
      400,
      "missing_map_asset",
      "Map config requires image_url or tile_url_template.",
    );
  }
  if ((imageWidth === null || imageHeight === null) && !tileTemplateUrl) {
    throw new AppError(
      400,
      "missing_image_dimensions",
      "image_width_px and image_height_px are required when using a static image.",
    );
  }
  if (!worldBounds) {
    throw new AppError(400, "missing_world_bounds", "world_bounds is required for map scaling.");
  }
  if (controlPoints.length < 2) {
    throw new AppError(
      400,
      "insufficient_control_points",
      "At least two control points are required for calibration.",
    );
  }
  validateControlPoints(controlPoints, imageWidth, imageHeight);

  return config;
};
