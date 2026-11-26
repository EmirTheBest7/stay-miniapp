import type { Amenity, CityId, Filters, Furnished, Kind, Listing, Own } from './types';
import { mediaUrl } from '../api';

/** The public listing payload (Mirror::payloadFor on the server). */
export interface PublicListing {
  id: number; kind: Kind; city: CityId; district: string; dispo: string; area: number; floor: number; rent: number; fees: number; fees_included: boolean;
  deposit: number; furnished: Furnished; pets: boolean; smoking: boolean; available_from: string | null; amenities: Amenity[]; energy: string | null;
  lat: number | null; lng: number | null; title: string; desc: Record<string, string>; src_lang: string;
  photos: { hash: string; w: number; h: number; ext?: string }[];
  host: { type: 'private' | 'agency'; name: string; since: number; verified: boolean; ico: string | null };
  published_at: number;
}

export function fromPublic(p: PublicListing, nowSec = Math.floor(Date.now() / 1000)): Listing {
  return {
    id: p.id, kind: p.kind, city: p.city, district: p.district, dispo: p.dispo, area: p.area, floor: p.floor, rent: p.rent, fees: p.fees, feesIncluded: p.fees_included,
    deposit: p.deposit, furnished: p.furnished, pets: p.pets, availableFrom: p.available_from ?? '1970-01-01', amenities: p.amenities ?? [], energy: p.energy ?? '–',
    lat: p.lat ?? 0, lng: p.lng ?? 0, seed: p.id, photos: p.photos.length, host: { type: p.host.type, name: p.host.name, since: p.host.since, verified: p.host.verified, ico: p.host.ico ?? undefined },
    createdAt: Math.max(0, Math.floor((nowSec - p.published_at) / 86400)),
    hashes: p.photos.map((x) => ({ hash: x.hash, ext: x.ext ?? 'webp' })), desc: p.desc, srcLang: p.src_lang,
  };
}

/** Filters in the server's wire format (only what is set). */
export function toWire(f: Filters): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (f.city !== 'all') o.city = f.city;
  if (f.kind !== 'all') o.kind = f.kind;
  if (f.district) o.district = f.district;
  if (f.dispo.length) o.dispo = f.dispo;
  for (const k of ['rentMin', 'rentMax', 'areaMin', 'depositMax'] as const) if (f[k] != null) o[k] = f[k];
  if (f.furnished !== 'any') o.furnished = f.furnished;
  for (const k of ['pets', 'feesIncluded', 'availableNow'] as const) if (f[k]) o[k] = true;
  if (f.advertiser !== 'all') o.advertiser = f.advertiser;
  if (f.amenities.length) o.amenities = f.amenities;
  return o;
}

/** Cover of an own listing (first photo), for My listings. */
export const ownCover = (o: Own, size: 240 | 640 = 240): string | null => (o.photos[0] ? mediaUrl(o.photos[0].hash, o.photos[0].ext, size) : null);
