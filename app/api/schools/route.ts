import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, queryBoundary } from "@/lib/arcgis";
import { lookupRating } from "@/lib/ratings";
import type { SchoolsResponse, ApiError } from "@/types/school";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json<ApiError>(
      { error: "address parameter is required", code: "INVALID_ADDRESS" },
      { status: 400 }
    );
  }

  let coords: { lng: number; lat: number };
  try {
    coords = await geocodeAddress(address);
  } catch (err: unknown) {
    const code =
      err instanceof Error && "code" in err && err.code === "INVALID_ADDRESS"
        ? "INVALID_ADDRESS"
        : "UPSTREAM_FAILURE";
    const status = code === "INVALID_ADDRESS" ? 400 : 502;
    return NextResponse.json<ApiError>(
      {
        error:
          code === "INVALID_ADDRESS"
            ? "Address not recognized, please try a full street address in Bellevue, WA."
            : "School data temporarily unavailable. Please try again later.",
        code,
      },
      { status }
    );
  }

  let results: Awaited<ReturnType<typeof queryBoundary>>[];
  try {
    results = await Promise.all([
      queryBoundary(coords.lng, coords.lat, "elementary"),
      queryBoundary(coords.lng, coords.lat, "middle"),
      queryBoundary(coords.lng, coords.lat, "high"),
    ]);
  } catch {
    return NextResponse.json<ApiError>(
      {
        error: "School data temporarily unavailable. Please try again later.",
        code: "UPSTREAM_FAILURE",
      },
      { status: 502 }
    );
  }

  const [elementary, middle, high] = results;

  if (!elementary && !middle && !high) {
    return NextResponse.json<ApiError>(
      {
        error:
          "This address is outside the Bellevue School District boundaries.",
        code: "OUTSIDE_BSD",
      },
      { status: 404 }
    );
  }

  const attach = (school: (typeof results)[0]) => {
    if (!school) return null;
    return { ...school, rating: lookupRating(school.ospiName) };
  };

  const response: SchoolsResponse = {
    elementary: attach(elementary),
    middle: attach(middle),
    high: attach(high),
  };

  return NextResponse.json<SchoolsResponse>(response);
}
