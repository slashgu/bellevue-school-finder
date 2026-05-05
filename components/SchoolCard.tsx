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

      {/* Proficiency bars */}
      {school.rating ? (
        <div className="flex flex-col gap-2 pt-1 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            OSPI % Met Standard (2018-19)
          </p>
          <ProficiencyBar label="ELA" value={school.rating.ela} />
          <ProficiencyBar label="Math" value={school.rating.math} />
          {school.rating.percentile !== null && (
            <p className="text-xs text-gray-600">
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
