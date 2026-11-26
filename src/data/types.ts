export type Kind = 'room' | 'flat' | 'house';
export type Furnished = 'yes' | 'part' | 'no';
export type Advertiser = 'private' | 'agency';
export type Amenity = 'balcony' | 'lift' | 'parking' | 'cellar' | 'terrace' | 'washer' | 'dishwasher' | 'ac';
export type CityId = 'prague' | 'brno' | 'ostrava';

export interface Host {
  type: Advertiser;
  name: string;
  since: number;
  verified: boolean;
  /** agencies only (DSA trader traceability); private owners never need one */
  ico?: string;
}

export interface Listing {
  id: number;
  kind: Kind;
  city: CityId;
  district: string;
  dispo: string;            // '1+kk' | '2+1' | ... | 'room' | 'house'
  area: number;             // m2
  floor: number;
  rent: number;             // whole CZK per month
  fees: number;             // monthly fees (energy, building); 0 when included
  feesIncluded: boolean;
  deposit: number;          // whole CZK, 0 = none
  furnished: Furnished;
  pets: boolean;
  availableFrom: string;    // ISO date; <= today means "now"
  amenities: Amenity[];
  energy: string;           // PENB class A-G
  lat: number;              // APPROXIMATE position only (grid-snapped); the exact address never leaves the server
  lng: number;
  seed: number;             // drives the procedural photos
  photos: number;
  host: Host;
  createdAt: number;        // days ago
}

export interface Filters {
  city: CityId | 'all';
  kind: Kind | 'all';
  district: string | null;
  dispo: string[];
  rentMin: number | null;
  rentMax: number | null;
  areaMin: number | null;
  furnished: Furnished | 'any';
  pets: boolean;
  depositMax: number | null;     // 0 = no deposit
  feesIncluded: boolean;
  advertiser: Advertiser | 'all';
  amenities: Amenity[];
  availableNow: boolean;
  sort: 'new' | 'cheap' | 'exp' | 'area';
}

export const EMPTY_FILTERS: Filters = {
  city: 'all', kind: 'all', district: null, dispo: [], rentMin: null, rentMax: null, areaMin: null, furnished: 'any', pets: false,
  depositMax: null, feesIncluded: false, advertiser: 'all', amenities: [], availableNow: false, sort: 'new',
};

export const DISPOS = ['room', '1+kk', '1+1', '2+kk', '2+1', '3+kk', '3+1', '4+kk'];
export const AMENITIES: Amenity[] = ['balcony', 'lift', 'parking', 'cellar', 'terrace', 'washer', 'dishwasher', 'ac'];
