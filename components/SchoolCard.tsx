import type { SchoolInfo } from "@/types/school";

const LEVEL_LABEL: Record<SchoolInfo["level"], string> = {
  elementary: "Elementary",
  middle: "Middle",
  high: "High School",
};

const LEVEL_COLOR: Record<SchoolInfo["level"], string> = {
  elementary: "bg-orange-100 text-orange-800",
  middle: "bg-blue-100 text-blue-800",
  high: "bg-purple-100 text-purple-800",
};

function ratingColor(r: number): string {
  if (r >= 8) return "bg-green-600";
  if (r >= 6) return "bg-amber-500";
  return "bg-orange-600";
}

function ProficiencyBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-700 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-green-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SubRatingRow({ label, value, detail }: { label: string; value: number | null; detail?: string }) {
  if (value === null) return null;
  const color = value >= 8 ? "bg-green-600" : value >= 6 ? "bg-amber-500" : "bg-orange-600";
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-gray-700 font-medium">{label}</span>
        {detail && <span className="text-[11px] text-gray-500 truncate">{detail}</span>}
      </div>
      <span className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-white ${color}`}>
        {value}
      </span>
    </div>
  );
}

export default function SchoolCard({ school }: { school: SchoolInfo }) {
  const r = school.rating?.rating ?? null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      {/* Header: level badge + grade range + rating badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLOR[school.level]}`}
          >
            {LEVEL_LABEL[school.level]}
          </span>
          <span className="text-xs text-gray-600">{school.grades}</span>
        </div>

        {r !== null && (
          <div className={`flex flex-col items-center justify-center rounded-lg px-2.5 py-1 text-white ${ratingColor(r)}`}>
            <span className="text-lg font-bold leading-none">{r}</span>
            <span className="text-[10px] leading-none opacity-90">/10</span>
          </div>
        )}
      </div>

      {/* School name + address */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">{school.bsdName}</h2>
        <p className="text-xs text-gray-600 mt-0.5">{school.address}</p>
      </div>

      {/* Ratings breakdown */}
      {school.rating ? (
        <div className="flex flex-col gap-2.5 pt-1 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Rating Breakdown (2023-24)
          </p>

          <SubRatingRow label="Test Scores" value={school.rating.testScoreRating}
            detail={school.rating.ela != null && school.rating.math != null
              ? `ELA ${school.rating.ela}% · Math ${school.rating.math}%`
              : undefined}
          />
          <SubRatingRow label="Student Progress" value={school.rating.progressRating} />
          {school.rating.collegeReadinessRating != null && (
            <SubRatingRow label="College Readiness" value={school.rating.collegeReadinessRating}
              detail={school.rating.gradRate != null
                ? `Grad ${school.rating.gradRate}% · AP ${school.rating.apRate ?? "?"}%`
                : undefined}
            />
          )}

          {school.rating.percentile !== null && (
            <p className="text-xs text-gray-600 pt-1 border-t border-gray-100">
              Statewide percentile: <span className="font-medium">{school.rating.percentile}th</span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">
          Assessment data not available
        </p>
      )}

      {school.url && (
        <a
          href={school.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-xs text-green-700 hover:underline font-medium"
        >
          Visit school website →
        </a>
      )}
    </div>
  );
}
