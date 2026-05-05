import type { SchoolInfo, SchoolLevel } from "@/types/school";

const GEOCODE_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

const BOUNDARY_BASE =
  "https://services1.arcgis.com/DjfAyvUwdiY6gnFC/arcgis/rest/services/BSD_School_Locator/FeatureServer";

const LAYER_MAP: Record<SchoolLevel, number> = {
  elementary: 1,
  middle: 2,
  high: 3,
};

export async function geocodeAddress(
  address: string
): Promise<{ lng: number; lat: number }> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("SingleLine", address);
  url.searchParams.set("maxLocations", "1");
  url.searchParams.set("outFields", "Match_addr");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Geocoder unreachable");

  const data = await res.json();
  const candidates: Array<{ location: { x: number; y: number }; score: number }> =
    data.candidates ?? [];

  const best = candidates[0];
  if (!best || best.score < 50) {
    throw Object.assign(new Error("Address not recognized"), {
      code: "INVALID_ADDRESS",
    });
  }

  return { lng: best.location.x, lat: best.location.y };
}

export async function queryBoundary(
  lng: number,
  lat: number,
  level: SchoolLevel
): Promise<SchoolInfo | null> {
  const layer = LAYER_MAP[level];
  const url = new URL(`${BOUNDARY_BASE}/${layer}/query`);
  url.searchParams.set("geometry", `${lng},${lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set(
    "outFields",
    "BSD_Name,OSPI_Name,School_Grades_Serviced,Address,Zip_Code,URL"
  );
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("BSD boundary service unreachable");

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const a = feature.attributes;
  return {
    level,
    bsdName: a.BSD_Name ?? "",
    ospiName: a.OSPI_Name ?? "",
    grades: a.School_Grades_Serviced ?? "",
    address: a.Address ?? "",
    url: a.URL ?? "",
    rating: null,
  };
}
