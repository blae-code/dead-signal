const GRID_COLUMNS = "ABCDEFGHIJ";
const GRID_ROWS = 8;

const toFinite = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeXYPoint = (record) => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const directX = toFinite(record.x);
  const directY = toFinite(record.y);
  if (directX !== null && directY !== null) {
    return { x: Math.max(0, Math.min(100, directX)), y: Math.max(0, Math.min(100, directY)), source: "xy" };
  }

  const nested = record.coords && typeof record.coords === "object" ? record.coords : null;
  if (nested) {
    const nestedX = toFinite(nested.x);
    const nestedY = toFinite(nested.y);
    if (nestedX !== null && nestedY !== null) {
      return { x: Math.max(0, Math.min(100, nestedX)), y: Math.max(0, Math.min(100, nestedY)), source: "coords" };
    }
  }

  return null;
};

export const parseGridCoordinate = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/(?:GRID\s*)?([A-J])\s*[-,:\s]?\s*(\d{1,2})/i);
  if (!match) {
    return null;
  }

  const col = GRID_COLUMNS.indexOf(match[1]);
  const row = Number(match[2]);
  if (col < 0 || !Number.isFinite(row) || row < 1 || row > GRID_ROWS) {
    return null;
  }

  const x = ((col + 0.5) / GRID_COLUMNS.length) * 100;
  const y = ((row - 0.5) / GRID_ROWS) * 100;
  return { x, y, source: "grid", grid: `${match[1]}${row}` };
};

export const resolveCoordinatePoint = (record, candidateFields = ["objective_coords", "coords_label", "location", "sector"]) => {
  const explicit = normalizeXYPoint(record);
  if (explicit) {
    return explicit;
  }

  for (const field of candidateFields) {
    const parsed = parseGridCoordinate(record?.[field]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};
