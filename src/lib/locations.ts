import data from "../data/cameroon-locations.json";

export interface City { name: string; quartiers: string[] }
export interface Region { id: string; name_en: string; name_fr: string; capital: string; cities: City[] }

/** Same algorithm as the backend `fold`: NFKD, drop combining marks, casefold, collapse whitespace, trim. */
export const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export const REGIONS: Region[] = data.regions;

export const citiesOf = (regionId: string): City[] => REGIONS.find((r) => r.id === regionId)?.cities ?? [];

/** Without a region id (legacy records) every region is searched for the city. */
export function quartiersOf(regionId: string | undefined, city: string): string[] {
  const key = fold(city);
  const pool = regionId ? citiesOf(regionId) : REGIONS.flatMap((r) => r.cities);
  return pool.find((c) => fold(c.name) === key)?.quartiers ?? [];
}

export const regionName = (id: string, lang: "en" | "fr" = "en") => {
  const r = REGIONS.find((x) => x.id === id);
  return r ? (lang === "fr" ? r.name_fr : r.name_en) : id;
};

/** Region id of the first city matching `city` (accent/case-insensitive), or "" when unknown. */
export const regionOfCity = (city: string) => {
  const key = fold(city);
  return key ? REGIONS.find((r) => r.cities.some((c) => fold(c.name) === key))?.id ?? "" : "";
};
