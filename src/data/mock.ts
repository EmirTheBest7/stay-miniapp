import type { Amenity, CityId, Host, Kind, Listing } from './types';

// SYNTHETIC data only: invented places, invented people, procedural photos. Nothing here is a real listing.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CITIES: Record<CityId, { lat: number; lng: number; spread: number; priceK: number; districts: string[] }> = {
  prague: { lat: 50.0755, lng: 14.4378, spread: 0.07, priceK: 1, districts: ['Vinohrady', 'Karlín', 'Žižkov', 'Smíchov', 'Holešovice', 'Letná', 'Vršovice', 'Dejvice', 'Nusle', 'Libeň', 'Břevnov', 'Pankrác'] },
  brno: { lat: 49.1951, lng: 16.6068, spread: 0.05, priceK: 0.68, districts: ['Brno-střed', 'Královo Pole', 'Žabovřesky', 'Líšeň', 'Husovice'] },
  ostrava: { lat: 49.8209, lng: 18.2625, spread: 0.05, priceK: 0.5, districts: ['Moravská Ostrava', 'Poruba', 'Zábřeh', 'Mariánské Hory'] },
};

const PRIVATE_NAMES = ['Anna K.', 'Petr N.', 'Olena M.', 'Ivan S.', 'Jana V.', 'Martin D.', 'Katia R.', 'Tomáš H.'];
const AGENCIES = ['Dům & Klíč (ukázka)', 'Střecha Reality (ukázka)', 'Nájem Plus (ukázka)'];
const DISPO_AREA: Record<string, [number, number, number]> = {
  '1+kk': [24, 40, 17000], '1+1': [32, 48, 18500], '2+kk': [42, 62, 24000], '2+1': [50, 72, 25500],
  '3+kk': [66, 95, 33000], '3+1': [72, 100, 33500], '4+kk': [90, 130, 45000],
};
const AMEN: Amenity[] = ['balcony', 'lift', 'parking', 'cellar', 'terrace', 'washer', 'dishwasher', 'ac'];

/** Snap to a ~400 m grid and add a stable offset: what the public map is allowed to show. */
export function approx(lat: number, lng: number, r: () => number): [number, number] {
  const g = 0.004;
  return [Math.round(lat / g) * g + (r() - 0.5) * g * 0.6, Math.round(lng / g) * g + (r() - 0.5) * g * 0.9];
}

export function makeListings(n = 48): Listing[] {
  const r = rng(20261126);
  const out: Listing[] = [];
  const today = new Date('2026-11-26');
  for (let i = 1; i <= n; i++) {
    const cityRoll = r();
    const city: CityId = cityRoll < 0.6 ? 'prague' : cityRoll < 0.85 ? 'brno' : 'ostrava';
    const c = CITIES[city];
    const district = c.districts[Math.floor(r() * c.districts.length)] as string;
    const kindRoll = r();
    const kind: Kind = kindRoll < 0.14 ? 'room' : kindRoll < 0.9 ? 'flat' : 'house';
    const dispoKeys = Object.keys(DISPO_AREA);
    const dispo = kind === 'room' ? 'room' : kind === 'house' ? 'house' : (dispoKeys[Math.floor(r() * dispoKeys.length)] as string);
    let area: number, base: number;
    if (kind === 'room') { area = 12 + Math.floor(r() * 10); base = 8500; }
    else if (kind === 'house') { area = 110 + Math.floor(r() * 80); base = 52000; }
    else { const d = DISPO_AREA[dispo] as [number, number, number]; area = d[0] + Math.floor(r() * (d[1] - d[0])); base = d[2]; }
    const rent = Math.round((base * c.priceK * (0.85 + r() * 0.35)) / 500) * 500;
    const feesIncluded = r() < 0.25;
    const fees = feesIncluded ? 0 : Math.round((1800 + area * 45) / 100) * 100;
    const deposit = r() < 0.12 ? 0 : rent * (r() < 0.6 ? 2 : r() < 0.8 ? 1 : 3);
    const furnished = r() < 0.4 ? 'yes' : r() < 0.7 ? 'part' : 'no';
    const amenities = AMEN.filter(() => r() < 0.32);
    const [lat0, lng0] = [c.lat + (r() - 0.5) * c.spread, c.lng + (r() - 0.5) * c.spread * 1.5];
    const [lat, lng] = approx(lat0, lng0, r);
    const isAgency = r() < 0.34;
    const host: Host = isAgency
      ? { type: 'agency', name: AGENCIES[Math.floor(r() * AGENCIES.length)] as string, since: 2026 - Math.floor(r() * 2), verified: true, ico: String(1 + Math.floor(r() * 9)).padStart(8, '0') }
      : { type: 'private', name: PRIVATE_NAMES[Math.floor(r() * PRIVATE_NAMES.length)] as string, since: 2026 - Math.floor(r() * 2), verified: r() < 0.7 };
    const offsetDays = r() < 0.5 ? -3 : Math.floor(r() * 50);
    const avail = new Date(today.getTime() + offsetDays * 86400000).toISOString().slice(0, 10);
    out.push({
      id: i, kind, city, district, dispo, area, floor: 1 + Math.floor(r() * 7), rent, fees, feesIncluded, deposit, furnished,
      pets: r() < 0.45, availableFrom: avail, amenities, energy: 'ABCDEFG'[Math.floor(r() * 5)] as string, lat, lng,
      seed: 1000 + i * 37, photos: 3 + Math.floor(r() * 3), host, createdAt: Math.floor(r() * 25),
    });
  }
  return out;
}

export const TODAY = '2026-11-26';
export const LISTINGS: Listing[] = makeListings();
