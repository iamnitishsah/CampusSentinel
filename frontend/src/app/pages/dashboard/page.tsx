"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

// A simple debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


interface Entity {
  entity_id: string;
  name: string;
  role: string;
  department: string;
  face_id?: string;
}

export default function DashboardPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const fetchEntities = useCallback(async (q: string = "") => {
    setLoading(true);
    try {
      const url = q
        ? `http://localhost:8000/api/entities/?q=${encodeURIComponent(q)}`
        : "http://localhost:8000/api/profiles/";

      const res = await fetch(url);

      if (res.ok) {
  const data = await res.json();
  const sortedData = [...data].sort((a, b) =>
    a.entity_id.localeCompare(b.entity_id, undefined, { numeric: true })
  );

  setEntities(sortedData);
}
 else {
        console.error("Failed to fetch entities:", res.statusText);
        setEntities([]);
      }
    } catch (err) {
      console.error("Error fetching entities:", err);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchEntities(debouncedSearch);
  }, [debouncedSearch, fetchEntities]);


  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto p-10">
        <h1 className="text-3xl font-bold mb-6 text-center">
          🏠 Campus Security Dashboard
        </h1>

        <div className="mb-8 flex justify-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email..."
            className="w-full max-w-xl p-3 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
   
        </div>

        {loading && (
          <div className="text-center text-slate-400">Loading...</div>
        )}

        <div className="overflow-x-auto bg-slate-900 rounded-xl shadow-lg">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-left">
                <th className="p-3 border-b border-slate-700">Sl. No.</th>
                <th className="p-3 border-b border-slate-700">Entity ID</th>
                <th className="p-3 border-b border-slate-700">Name</th>
                <th className="p-3 border-b border-slate-700">Role</th>
                <th className="p-4 border-b border-slate-700">Face ID</th>  
                <th className="p-3 border-b border-slate-700">Department</th>
                <th className="p-3 border-b border-slate-700">Details</th>
              </tr>
            </thead>
            <tbody>
              {entities.length > 0 ? (
                entities.map((entity, index) => (
                  <tr
                    key={entity.entity_id}
                    className="hover:bg-slate-800 transition-colors"
                  >
                    <td className="p-3 border-b border-slate-800">
                      {index + 1}
                    </td>
                    <td className="p-3 border-b border-slate-800">
                      {entity.entity_id}
                    </td>
                    <td className="p-3 border-b border-slate-800">
                      {entity.name}
                    </td>
                    <td className="p-3 border-b border-slate-800">
                      {entity.role}
                    </td>
                    <td className="p-3 border-b border-slate-800">
                      {entity.face_id || "—"}
                    </td>
                    <td className="p-3 border-b border-slate-800">
                      {entity.department || "—"}
                    </td>
                    <td className="p-3 border-b border-slate-800">
                      <Link
                        href={`/pages/EntitySearch/${entity.entity_id}`}
                        className="text-blue-400 hover:underline"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    { !loading && "No entities found." }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}