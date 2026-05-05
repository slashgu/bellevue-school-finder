import ratingsData from "@/data/ospi-ratings.json";
import type { SchoolRating } from "@/types/school";

type RatingsMap = Record<string, { ela: number | null; math: number | null; rating: number | null; percentile: number | null }>;

const ratings = ratingsData as unknown as RatingsMap;

export function lookupRating(ospiName: string): SchoolRating | null {
  const key = ospiName.trim().toLowerCase();
  const entry = Object.entries(ratings).find(
    ([k]) => k.toLowerCase() === key
  );
  if (!entry) return null;
  const { ela, math, rating, percentile } = entry[1];
  return { ela, math, rating: rating ?? null, percentile: percentile ?? null };
}
