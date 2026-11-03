export function km(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const p1 = (a[0] * Math.PI) / 180, p2 = (b[0] * Math.PI) / 180;
  const dp = p2 - p1, dl = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Places used to name where someone is ("near Pune"). Coarse on purpose.
const PLACES: [string, number, number][] = [
  ['Bengaluru', 12.97, 77.59], ['Mumbai', 19.08, 72.88], ['Delhi', 28.61, 77.21], ['Kolkata', 22.57, 88.36],
  ['Chennai', 13.08, 80.27], ['Hyderabad', 17.39, 78.49], ['Pune', 18.52, 73.86], ['Ahmedabad', 23.02, 72.57],
  ['Jaipur', 26.91, 75.79], ['Kochi', 9.93, 76.27], ['Goa', 15.5, 73.83], ['Chandigarh', 30.73, 76.78],
  ['Lucknow', 26.85, 80.95], ['Guwahati', 26.14, 91.74], ['Bhopal', 23.26, 77.41], ['Nashik', 20.0, 73.79],
  ['Indore', 22.72, 75.86], ['Nagpur', 21.15, 79.09], ['Surat', 21.17, 72.83], ['Mysuru', 12.3, 76.64],
  ['Coimbatore', 11.02, 76.96], ['Thiruvananthapuram', 8.52, 76.94], ['Visakhapatnam', 17.69, 83.22], ['Bhubaneswar', 20.3, 85.82],
  ['Patna', 25.59, 85.14], ['Varanasi', 25.32, 82.97], ['Dehradun', 30.32, 78.03], ['Shimla', 31.1, 77.17],
  ['Srinagar', 34.08, 74.8], ['Udaipur', 24.58, 73.71], ['Amritsar', 31.63, 74.87], ['Shillong', 25.58, 91.89],
  ['Kathmandu', 27.72, 85.32], ['Colombo', 6.93, 79.86], ['Dhaka', 23.81, 90.41], ['Dubai', 25.2, 55.27],
  ['Singapore', 1.35, 103.82], ['London', 51.51, -0.13], ['Berlin', 52.52, 13.4], ['Dessau', 51.84, 12.24],
  ['Paris', 48.86, 2.35], ['New York', 40.71, -74.0], ['San Francisco', 37.77, -122.42], ['Toronto', 43.65, -79.38],
  ['Sydney', -33.87, 151.21], ['Tokyo', 35.68, 139.69]
];

export function placeName(lat: number, lon: number): string {
  let best = PLACES[0], bd = Infinity;
  for (const p of PLACES) {
    const d = km([lat, lon], [p[1], p[2]]);
    if (d < bd) { bd = d; best = p; }
  }
  return bd < 60 ? best[0] : `${best[0]} region`;
}

// Two hand-drawn maps in Web Mercator: India up close, and the world for friends further away.
export interface MapDef { img: string; lon0: number; lon1: number; lat0: number; lat1: number; vw: number; vh: number }
export const INDIA: MapDef = { img: '/assets/map-india.jpg', lon0: 71.0753, lon1: 91.3247, lat0: 6.5, lat1: 33.5, vw: 390, vh: 560 };
export const WORLD: MapDef = { img: '/assets/map-world.jpg', lon0: -180, lon1: 180, lat0: -58, lat1: 78, vw: 1000, vh: 557.5 };
const Y = (la: number) => Math.log(Math.tan(Math.PI / 4 + (la * Math.PI) / 360));

export function onMap(m: MapDef, lat: number, lon: number): boolean {
  return lat >= m.lat0 && lat <= m.lat1 && lon >= m.lon0 && lon <= m.lon1;
}
export const onIndiaMap = (lat: number, lon: number) => onMap(INDIA, lat, lon);

/** India when both people are in it, otherwise the world. */
export function pickMap(a: [number, number], b: [number, number]): MapDef | null {
  if (onMap(INDIA, a[0], a[1]) && onMap(INDIA, b[0], b[1])) return INDIA;
  if (onMap(WORLD, a[0], a[1]) && onMap(WORLD, b[0], b[1])) return WORLD;
  return null;
}

/** Returns 0..1 position on a map image. */
export function project(lat: number, lon: number, m: MapDef = INDIA): [number, number] {
  const x = (lon - m.lon0) / (m.lon1 - m.lon0);
  const y = (Y(m.lat1) - Y(lat)) / (Y(m.lat1) - Y(m.lat0));
  return [Math.min(0.97, Math.max(0.03, x)), Math.min(0.97, Math.max(0.03, y))];
}

/** A gently wandering path between two map points; t in 0..1. Distance is still the straight line. */
export function wander(a: [number, number], b: [number, number], t: number): [number, number] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const w = Math.sin(t * Math.PI * 3) * 0.018 * Math.sin(t * Math.PI);
  return [a[0] + dx * t + nx * w, a[1] + dy * t + ny * w];
}
