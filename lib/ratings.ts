import ratingsData from "@/data/ospi-ratings.json";
import type { SchoolRating } from "@/types/school";

type RatingsMap = Record<string, {
  ela: number | null;
  math: number | null;
  rating: number | null;
  percentile: number | null;
  testScoreRating: number | null;
  progressRating: number | null;
  collegeReadinessRating: number | null;
  gradRate: number | null;
  apRate: number | null;
}>;

const ratings = ratingsData as unknown as RatingsMap;

export function lookupRating(ospiName: string): SchoolRating | null {
  const key = ospiName.trim().toLowerCase();
  const entry = Object.entries(ratings).find(([k]) => k.toLowerCase() === key);
  if (!entry) return null;
  const d = entry[1];
  return {
    ela: d.ela ?? null,
    math: d.math ?? null,
    rating: d.rating ?? null,
    percentile: d.percentile ?? null,
    testScoreRating: d.testScoreRating ?? null,
    progressRating: d.progressRating ?? null,
    collegeReadinessRating: d.collegeReadinessRating ?? null,
    gradRate: d.gradRate ?? null,
    apRate: d.apRate ?? null,
  };
}
