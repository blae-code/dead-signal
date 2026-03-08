const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asPoint = (value) => {
  if (!value || typeof value !== "object") return null;
  const x = toNumber(value.x);
  const y = toNumber(value.y);
  if (x === null || y === null) return null;
  return { x, y };
};

const getBounds = (config) => {
  if (!config || typeof config !== "object") return null;
  const bounds = config.world_bounds;
  if (!bounds || typeof bounds !== "object") return null;
  const minX = toNumber(bounds.min_x);
  const maxX = toNumber(bounds.max_x);
  const minY = toNumber(bounds.min_y);
  const maxY = toNumber(bounds.max_y);
  if (minX === null || maxX === null || minY === null || maxY === null) return null;
  if (!(maxX > minX && maxY > minY)) return null;
  return { minX, maxX, minY, maxY };
};

const getControlPoints = (config) => {
  const points = Array.isArray(config?.control_points) ? config.control_points : [];
  return points
    .map((entry) => {
      const image = asPoint(entry?.image);
      const world = asPoint(entry?.world);
      if (!image || !world) return null;
      return { image, world };
    })
    .filter(Boolean);
};

const getCalibrationModel = (config) => {
  const width = toNumber(config?.image_width_px);
  const height = toNumber(config?.image_height_px);
  if (width === null || height === null || width <= 0 || height <= 0) {
    return null;
  }

  const points = getControlPoints(config);
  if (points.length < 2) {
    return null;
  }

  let first = null;
  let second = null;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (a.image.x !== b.image.x && a.image.y !== b.image.y) {
        first = a;
        second = b;
        break;
      }
    }
    if (first && second) break;
  }

  if (!first || !second) {
    return null;
  }

  const sx = (second.world.x - first.world.x) / (second.image.x - first.image.x);
  const sy = (second.world.y - first.world.y) / (second.image.y - first.image.y);
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx === 0 || sy === 0) {
    return null;
  }

  const bx = first.world.x - sx * first.image.x;
  const by = first.world.y - sy * first.image.y;
  if (!Number.isFinite(bx) || !Number.isFinite(by)) {
    return null;
  }

  return {
    width,
    height,
    sx,
    sy,
    bx,
    by,
  };
};

export const hasUsableMapConfig = (config) => {
  const hasBounds = Boolean(getBounds(config));
  if (!hasBounds) return false;
  const hasImage = typeof config?.image_url === "string" && config.image_url.trim();
  const hasTiles = typeof config?.tile_url_template === "string" && config.tile_url_template.trim();
  return Boolean(hasImage || hasTiles);
};

export const normalizedToWorld = (normalized, config) => {
  if (!hasUsableMapConfig(config)) return null;
  const point = asPoint(normalized);
  if (!point) return null;

  const bounds = getBounds(config);
  if (!bounds) return null;
  const nx = clamp(point.x / 100, 0, 1);
  const ny = clamp(point.y / 100, 0, 1);

  const calibration = getCalibrationModel(config);
  if (calibration) {
    const imageX = nx * calibration.width;
    const imageY = ny * calibration.height;
    return {
      x: clamp(calibration.sx * imageX + calibration.bx, bounds.minX, bounds.maxX),
      y: clamp(calibration.sy * imageY + calibration.by, bounds.minY, bounds.maxY),
    };
  }

  return {
    x: bounds.minX + (bounds.maxX - bounds.minX) * nx,
    y: bounds.minY + (bounds.maxY - bounds.minY) * ny,
  };
};

export const worldToNormalized = (world, config) => {
  if (!hasUsableMapConfig(config)) return null;
  const point = asPoint(world);
  if (!point) return null;

  const bounds = getBounds(config);
  if (!bounds) return null;

  const calibration = getCalibrationModel(config);
  if (calibration) {
    const imageX = (point.x - calibration.bx) / calibration.sx;
    const imageY = (point.y - calibration.by) / calibration.sy;
    return {
      x: clamp((imageX / calibration.width) * 100, 0, 100),
      y: clamp((imageY / calibration.height) * 100, 0, 100),
    };
  }

  return {
    x: clamp(((point.x - bounds.minX) / (bounds.maxX - bounds.minX)) * 100, 0, 100),
    y: clamp(((point.y - bounds.minY) / (bounds.maxY - bounds.minY)) * 100, 0, 100),
  };
};

export const resolveNormalizedPoint = (row, config) => {
  if (!row || typeof row !== "object") return null;
  const nx = toNumber(row.normalized_x ?? row.x);
  const ny = toNumber(row.normalized_y ?? row.y);
  if (nx !== null && ny !== null) {
    return { x: clamp(nx, 0, 100), y: clamp(ny, 0, 100) };
  }
  const wx = toNumber(row.world_x);
  const wy = toNumber(row.world_y);
  if (wx === null || wy === null) return null;
  return worldToNormalized({ x: wx, y: wy }, config);
};

export const mapPointWithTransform = (row, config) => {
  const normalized = resolveNormalizedPoint(row, config);
  if (!normalized) return null;
  const world = normalizedToWorld(normalized, config);
  return {
    normalized_x: normalized.x,
    normalized_y: normalized.y,
    world_x: world?.x ?? toNumber(row?.world_x),
    world_y: world?.y ?? toNumber(row?.world_y),
  };
};
