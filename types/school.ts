export type SchoolLevel = "elementary" | "middle" | "high";

export interface SchoolRating {
  ela: number | null;
  math: number | null;
  rating: number | null;
  percentile: number | null;
}

export interface SchoolInfo {
  level: SchoolLevel;
  bsdName: string;
  ospiName: string;
  grades: string;
  address: string;
  url: string;
  rating: SchoolRating | null;
}

export interface SchoolsResponse {
  elementary: SchoolInfo | null;
  middle: SchoolInfo | null;
  high: SchoolInfo | null;
}

export interface ApiError {
  error: string;
  code: "INVALID_ADDRESS" | "OUTSIDE_BSD" | "UPSTREAM_FAILURE";
}
