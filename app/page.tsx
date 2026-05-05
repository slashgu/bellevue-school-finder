"use client";

import { useState } from "react";
import AddressForm from "@/components/AddressForm";
import SchoolResults from "@/components/SchoolResults";
import type { SchoolsResponse, ApiError } from "@/types/school";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SchoolsResponse | null>(null);

  async function handleSearch(address: string) {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/schools?address=${encodeURIComponent(address)}`
      );
      const json = await res.json();

      if (!res.ok) {
        setError((json as ApiError).error);
      } else {
        setData(json as SchoolsResponse);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-16 gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Bellevue School Finder
        </h1>
        <p className="mt-2 text-gray-500 text-sm">
          Enter a Bellevue, WA address to see assigned schools and their OSPI
          performance ratings.
        </p>
      </div>

      <AddressForm onSubmit={handleSearch} loading={loading} />

      <SchoolResults loading={loading} error={error} data={data} />
    </main>
  );
}
