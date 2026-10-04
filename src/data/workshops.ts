/**
 * Workshops in the Greater Helsinki region that Meconet's own order log says are
 * carrying a kit right now.
 *
 * This is deliberately inference, not inventory: Meconet knows what it shipped and
 * when, not what has since been used up. Everything downstream of this file is
 * therefore hedged — "likely on the shelf", "worth a call first" — because the one
 * thing worse than not offering local pickup is sending someone across the city for
 * a box that was emptied in July.
 *
 * Coordinates are real so the map pins, the distances and the directions link all
 * agree with each other. The map drawing itself is schematic (see RegionMap).
 */

export interface WorkshopStock {
  /** Boxes the order log implies are on the shelf. */
  boxes: number;
  /** When this workshop last ordered this kit from Meconet. ISO date. */
  lastOrdered: string;
}

export interface Workshop {
  id: string;
  name: string;
  /** Neighbourhood plus city, e.g. "Otaniemi, Espoo" — how a local would say it. */
  district: string;
  street: string;
  postal: string;
  phone: string;
  hours: string;
  lat: number;
  lon: number;
  /** Keyed by kit slug. A kit missing from here is simply not stocked. */
  stock: Record<string, WorkshopStock>;
}

/**
 * Where "near you" is measured from. A real build would ask the browser for a
 * position; for the prototype everyone is standing in Tapiola so that every
 * session produces the same distances and the same ordering.
 */
export const DEMO_LOCATION = {
  label: "Tapiola, Espoo",
  lat: 60.176,
  lon: 24.805,
};

export const workshops: Workshop[] = [
  {
    id: "teknikka",
    name: "Teknikka Oy",
    district: "Otaniemi, Espoo",
    street: "Metallimiehenkuja 4",
    postal: "02150 Espoo",
    phone: "+358 9 455 2100",
    hours: "Mon–Fri 7:30–16:00",
    lat: 60.1845,
    lon: 24.83,
    stock: {
      "mechatro-kit": { boxes: 3, lastOrdered: "2026-09-18" },
      "home-kit": { boxes: 1, lastOrdered: "2026-08-02" },
    },
  },
  {
    id: "pitajanmaki",
    name: "Pitäjänmäen Konehuolto",
    district: "Pitäjänmäki, Helsinki",
    street: "Takkatie 18",
    postal: "00370 Helsinki",
    phone: "+358 9 562 7740",
    hours: "Mon–Fri 7:00–17:00, Sat 9:00–14:00",
    lat: 60.2187,
    lon: 24.865,
    stock: {
      "garage-kit": { boxes: 4, lastOrdered: "2026-09-26" },
      "mechatro-kit": { boxes: 2, lastOrdered: "2026-09-02" },
      "bike-kit": { boxes: 2, lastOrdered: "2026-07-14" },
    },
  },
  {
    id: "herttoniemi",
    name: "Herttoniemi Mekaniikka",
    district: "Herttoniemi, Helsinki",
    street: "Laippatie 6",
    postal: "00880 Helsinki",
    phone: "+358 9 759 3310",
    hours: "Mon–Fri 8:00–16:30",
    lat: 60.195,
    lon: 25.03,
    stock: {
      "mechatro-kit": { boxes: 2, lastOrdered: "2026-09-29" },
      "bike-kit": { boxes: 3, lastOrdered: "2026-09-21" },
      "home-kit": { boxes: 2, lastOrdered: "2026-06-05" },
    },
  },
  {
    id: "petikko",
    name: "Petikon Teollisuushuolto",
    district: "Petikko, Vantaa",
    street: "Tiilitie 12",
    postal: "01720 Vantaa",
    phone: "+358 9 878 4460",
    hours: "Mon–Fri 6:30–15:30",
    lat: 60.287,
    lon: 24.824,
    stock: {
      "garage-kit": { boxes: 3, lastOrdered: "2026-08-20" },
      "trampoline-kit": { boxes: 2, lastOrdered: "2026-06-30" },
      "mechatro-kit": { boxes: 1, lastOrdered: "2026-05-11" },
    },
  },
  {
    id: "kivenlahti",
    name: "Kivenlahden Konepaja",
    district: "Kivenlahti, Espoo",
    street: "Merituulentie 30",
    postal: "02320 Espoo",
    phone: "+358 9 863 1180",
    hours: "Mon–Fri 7:00–16:00",
    lat: 60.1555,
    lon: 24.695,
    stock: {
      "boat-kit": { boxes: 3, lastOrdered: "2026-09-10" },
      "garage-kit": { boxes: 2, lastOrdered: "2026-07-28" },
    },
  },
  {
    id: "tikkurila",
    name: "Tikkurilan Konepalvelu",
    district: "Tikkurila, Vantaa",
    street: "Hiekkakuja 3",
    postal: "01300 Vantaa",
    phone: "+358 9 836 2270",
    hours: "Mon–Fri 7:30–16:00",
    lat: 60.293,
    lon: 25.04,
    stock: {
      "garage-kit": { boxes: 2, lastOrdered: "2026-08-14" },
      "boat-kit": { boxes: 1, lastOrdered: "2026-07-02" },
      "trampoline-kit": { boxes: 1, lastOrdered: "2026-04-22" },
    },
  },
];

/**
 * How much we are willing to promise. Recent orders are stated plainly; older ones
 * are shown as a maybe, because a box last bought in spring may well be empty.
 */
export type StockConfidence = "likely" | "possible";

export interface NearbyWorkshop extends Workshop {
  kitStock: WorkshopStock;
  distanceKm: number;
  confidence: StockConfidence;
}

const EARTH_RADIUS_KM = 6371;
const CONFIDENT_WITHIN_DAYS = 75;

/** Great-circle distance. Over 20 km of city this is close enough to drive by. */
export function distanceKm(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Pinned to a constant so the prototype reads identically whenever it is run —
 * a confidence badge that flips between test sessions would be a confound.
 */
const TODAY = new Date("2026-10-04T00:00:00Z");

function confidenceFor(lastOrdered: string): StockConfidence {
  const days = (TODAY.getTime() - new Date(lastOrdered).getTime()) / 86_400_000;
  return days <= CONFIDENT_WITHIN_DAYS ? "likely" : "possible";
}

/** Everyone carrying this kit, nearest first. */
export function workshopsStocking(kitSlug: string): NearbyWorkshop[] {
  return workshops
    .filter((workshop) => workshop.stock[kitSlug])
    .map((workshop) => ({
      ...workshop,
      kitStock: workshop.stock[kitSlug],
      distanceKm: distanceKm(DEMO_LOCATION, workshop),
      confidence: confidenceFor(workshop.stock[kitSlug].lastOrdered),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function formatDistance(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatLastOrdered(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(iso));
}

/** Opens the real address in whatever maps app the participant actually uses. */
export function directionsUrl(workshop: Workshop): string {
  const query = encodeURIComponent(`${workshop.street}, ${workshop.postal}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}
