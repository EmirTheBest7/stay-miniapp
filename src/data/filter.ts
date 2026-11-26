import { TODAY } from './mock';
import type { Filters, Listing } from './types';

export function matches(l: Listing, f: Filters): boolean {
  if (f.city !== 'all' && l.city !== f.city) return false;
  if (f.kind !== 'all' && l.kind !== f.kind) return false;
  if (f.district && l.district !== f.district) return false;
  if (f.dispo.length && !f.dispo.includes(l.dispo)) return false;
  if (f.rentMin != null && l.rent < f.rentMin) return false;
  if (f.rentMax != null && l.rent > f.rentMax) return false;
  if (f.areaMin != null && l.area < f.areaMin) return false;
  if (f.furnished !== 'any' && l.furnished !== f.furnished) return false;
  if (f.pets && !l.pets) return false;
  if (f.depositMax != null && l.deposit > f.depositMax) return false;
  if (f.feesIncluded && !l.feesIncluded) return false;
  if (f.advertiser !== 'all' && l.host.type !== f.advertiser) return false;
  if (f.availableNow && l.availableFrom > TODAY) return false;
  if (f.amenities.length && !f.amenities.every((a) => l.amenities.includes(a))) return false;
  return true;
}

export function run(all: Listing[], f: Filters): Listing[] {
  const out = all.filter((l) => matches(l, f));
  const by = {
    new: (a: Listing, b: Listing) => a.createdAt - b.createdAt,
    cheap: (a: Listing, b: Listing) => a.rent - b.rent,
    exp: (a: Listing, b: Listing) => b.rent - a.rent,
    area: (a: Listing, b: Listing) => b.area - a.area,
  }[f.sort];
  return out.sort(by);
}

/** How many filters differ from the defaults (badge on the filter button). */
export function activeCount(f: Filters): number {
  return (f.district ? 1 : 0) + (f.dispo.length ? 1 : 0) + (f.rentMin != null || f.rentMax != null ? 1 : 0) + (f.areaMin != null ? 1 : 0) + (f.furnished !== 'any' ? 1 : 0)
    + (f.pets ? 1 : 0) + (f.depositMax != null ? 1 : 0) + (f.feesIncluded ? 1 : 0) + (f.advertiser !== 'all' ? 1 : 0) + (f.amenities.length ? 1 : 0) + (f.availableNow ? 1 : 0);
}
