/**
 * A deliberately simplified, stylised outline of India (longitude, latitude), clockwise from the north-west.
 * It is artwork, not a survey: boundaries are approximate and no political statement is intended.
 * Shared by the WebGL and canvas renderers so the map reads the same everywhere.
 */
export const INDIA_OUTLINE: Array<[number, number]> = [
  [68.5, 23.8],
  [69.8, 24.6],
  [70.4, 25.7],
  [71.0, 27.0],
  [72.4, 28.7],
  [73.9, 29.9],
  [74.5, 31.0],
  [74.6, 32.1],
  [75.3, 32.4],
  [74.2, 33.5],
  [73.9, 34.6],
  [74.6, 35.9],
  [75.8, 36.7],
  [77.8, 35.5],
  [78.9, 34.3],
  [79.3, 32.5],
  [78.8, 31.3],
  [79.6, 30.7],
  [80.5, 30.4],
  [80.1, 29.2],
  [80.1, 28.9],
  [81.5, 28.3],
  [82.5, 27.6],
  [84.2, 27.1],
  [85.5, 26.8],
  [87.0, 26.5],
  [88.1, 26.5],
  [88.0, 27.9],
  [88.9, 27.4],
  [89.8, 26.9],
  [92.1, 26.9],
  [92.6, 27.8],
  [94.3, 29.2],
  [96.1, 29.3],
  [97.4, 28.3],
  [96.9, 27.2],
  [95.3, 26.7],
  [95.1, 25.3],
  [94.6, 24.6],
  [94.1, 23.4],
  [93.3, 22.0],
  [92.6, 22.2],
  [92.3, 23.7],
  [92.2, 24.3],
  [91.2, 24.2],
  [90.0, 25.2],
  [89.8, 25.9],
  [89.1, 26.2],
  [88.4, 26.3],
  [88.1, 25.5],
  [88.9, 24.9],
  [88.7, 24.2],
  [88.2, 23.6],
  [88.9, 22.7],
  [88.9, 21.6],
  [87.5, 21.5],
  [86.9, 20.9],
  [86.0, 19.9],
  [85.0, 19.4],
  [84.3, 18.4],
  [83.3, 17.6],
  [82.3, 16.9],
  [81.3, 16.2],
  [80.3, 15.5],
  [80.2, 13.4],
  [80.3, 12.3],
  [79.8, 10.8],
  [79.5, 9.8],
  [78.5, 9.3],
  [78.1, 8.5],
  [77.5, 8.1],
  [76.6, 8.9],
  [76.2, 9.9],
  [75.7, 11.4],
  [74.8, 12.9],
  [74.5, 14.4],
  [73.9, 15.6],
  [73.4, 16.8],
  [73.0, 18.5],
  [72.8, 19.3],
  [72.7, 20.5],
  [72.9, 21.2],
  [72.6, 21.9],
  [72.2, 21.5],
  [71.8, 20.8],
  [70.5, 20.8],
  [69.2, 22.2],
  [68.9, 22.9],
  [69.8, 22.7],
];

/** Bounding box of the outline (lon/lat). */
export const INDIA_BOUNDS = { minLon: 68.0, maxLon: 97.5, minLat: 8.0, maxLat: 37.0 };

/**
 * Normalises the outline into a unit square centred at the origin, x → east, y → north,
 * preserving aspect (1° lon ≈ 0.9° lat at India's latitude).
 */
export function indiaUnitPolygon(): Array<[number, number]> {
  const { minLon, maxLon, minLat, maxLat } = INDIA_BOUNDS;
  const w = (maxLon - minLon) * 0.9;
  const h = maxLat - minLat;
  const scale = 1 / Math.max(w, h);
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  return INDIA_OUTLINE.map(([lon, lat]) => [(lon - cx) * 0.9 * scale, (lat - cy) * scale]);
}

/** A conceptual highlight location (roughly central-north India). Not a real GI location. */
export const CONCEPTUAL_MARKER: [number, number] = [78.0, 22.5];

export function toUnit([lon, lat]: [number, number]): [number, number] {
  const { minLon, maxLon, minLat, maxLat } = INDIA_BOUNDS;
  const w = (maxLon - minLon) * 0.9;
  const h = maxLat - minLat;
  const scale = 1 / Math.max(w, h);
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  return [(lon - cx) * 0.9 * scale, (lat - cy) * scale];
}
