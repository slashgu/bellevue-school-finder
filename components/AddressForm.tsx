"use client";

import { useState } from "react";

interface Props {
  onSubmit: (address: string) => void;
  loading: boolean;
}

export default function AddressForm({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 1200 NE 8th St, Bellevue, WA"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded-lg bg-green-700 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-green-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Looking up…" : "Find Schools"}
      </button>
    </form>
  );
}
