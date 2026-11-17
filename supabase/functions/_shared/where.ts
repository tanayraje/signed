// Where an owl is, in words: over a city, so many km from the nearest big city, or out over a named sea.
// Shared by the app and the tick function, so it has no imports. The data lives in where-data.json:
// `land` is a half-degree land/sea grid from Natural Earth (public domain), run-length encoded:
// rows from 90°N to 90°S, columns from 180°W eastward, runs alternate sea, land, sea… in base 36.
// `cities` are big cities plus the Indian ones friends fly between; `seas` are points inside each sea.

export type Spot = [string, number, number];
export interface WhereData { res: number; land: string; cities: Spot[]; seas: Spot[] }

export function distKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180, h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function nearest(list: Spot[], at: [number, number]): [Spot, number] {
  let best = list[0], bd = Infinity;
  for (const p of list) { const d = distKm(at, [p[1], p[2]]); if (d < bd) { bd = d; best = p; } }
  return [best, bd];
}

const roundKm = (d: number) => (d < 100 ? Math.max(10, Math.round(d / 10) * 10) : Math.round(d / 50) * 50);

export function makeWhere(data: WhereData) {
  const W = Math.round(360 / data.res), H = Math.round(180 / data.res);
  let grid: Uint8Array | null = null;
  const landGrid = () => {
    if (grid) return grid;
    const g = new Uint8Array(W * H);
    let i = 0, v = 0;
    for (const r of data.land.split(',')) { const n = parseInt(r, 36); if (v) g.fill(1, i, i + n); i += n; v ^= 1; }
    return (grid = g);
  };

  function isLand(lat: number, lon: number): boolean {
    const y = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / data.res)));
    const x = ((Math.floor((lon + 180) / data.res) % W) + W) % W;
    return landGrid()[y * W + x] === 1;
  }

  /**
   * Where a point is, ready to follow "Hedwig is …":
   * "over Dubai", "about 200 km from Dubai", "over the Arabian Sea, about 150 km off Mumbai",
   * "over the Indian Ocean", or "far from anywhere".
   */
  function whereabouts(lat: number, lon: number): string {
    const at: [number, number] = [lat, lon];
    const [city, d] = nearest(data.cities, at);
    if (d < 25) return `over ${city[0]}`;
    if (!isLand(lat, lon)) {
      const sea = nearest(data.seas, at)[0][0];
      return d < 350 ? `over ${sea}, about ${roundKm(d)} km off ${city[0]}` : `over ${sea}`;
    }
    return d < 600 ? `about ${roundKm(d)} km from ${city[0]}` : 'far from anywhere';
  }

  /** The nearest city in a word, for where someone lives ("near Pune"). */
  function placeName(lat: number, lon: number): string {
    const [city, d] = nearest(data.cities, [lat, lon]);
    return d < 60 ? city[0] : `${city[0]} region`;
  }

  return { isLand, whereabouts, placeName };
}
