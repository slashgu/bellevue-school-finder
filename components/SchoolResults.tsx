import type { SchoolInfo, SchoolsResponse } from "@/types/school";
import SchoolCard from "./SchoolCard";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse flex flex-col gap-3">
      <div className="h-5 w-24 rounded-full bg-gray-200" />
      <div className="h-4 w-40 rounded bg-gray-200" />
      <div className="h-3 w-32 rounded bg-gray-100" />
      <div className="mt-2 space-y-2">
        <div className="h-2 w-full rounded bg-gray-100" />
        <div className="h-2 w-full rounded bg-gray-100" />
      </div>
    </div>
  );
}

interface Props {
  loading: boolean;
  error: string | null;
  data: SchoolsResponse | null;
}

export default function SchoolResults({ loading, error, data }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const schools = [data.elementary, data.middle, data.high].filter(
    (s): s is SchoolInfo => s !== null
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
      {schools.map((school) => (
        <SchoolCard key={school.level} school={school} />
      ))}
    </div>
  );
}
