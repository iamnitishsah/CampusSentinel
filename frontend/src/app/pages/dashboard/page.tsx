"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Entity {
  entity_id: string;
  name: string;
  role: string;
  department: string;
}

export default function DashboardPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEntities = async (q: string = "") => {
    setLoading(true);
    try {
      const url = q ? `http://localhost:8000/api/entities/?q=${encodeURIComponent(q)}` : "http://localhost:8000/api/entities/";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEntities(data);
      } else {
        console.error("Failed to fetch entities");
        setEntities([]);
      }
    } catch (err) {
      console.error("Error fetching entities:", err);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleSearch = () => {
    fetchEntities(search);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-6 text-center">
          🏠 Campus Security Dashboard
        </h1>

        <div className="mb-8 flex justify-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full max-w-xl p-3 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {loading && <div className="text-center text-slate-400">Loading...</div>}

        <div className="overflow-x-auto bg-slate-900 rounded-xl shadow-lg">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-left">
                <th className="p-3 border-b border-slate-700">Sl. No.</th>
                <th className="p-3 border-b border-slate-700">Entity ID</th>
                <th className="p-3 border-b border-slate-700">Name</th>
                <th className="p-3 border-b border-slate-700">Role</th>
                <th className="p-3 border-b border-slate-700">Department</th>

              </tr>
            </thead>
            <tbody>
              {entities.length > 0 ? (
                entities.map((entity, index) => (
                  <tr
                    key={entity.entity_id}
                    className="hover:bg-slate-800 transition-colors"
                  >
                    <td className="p-3 border-b border-slate-800">{index + 1}</td>
                    <td className="p-3 border-b border-slate-800">{entity.entity_id}</td>
                    <td className="p-3 border-b border-slate-800">{entity.name}</td>
                    <td className="p-3 border-b border-slate-800">{entity.role}</td>
                    <td className="p-3 border-b border-slate-800">{entity.department || "—"}</td>
                    <td className="p-3 border-b border-slate-800">
                      <Link href={`/pages/EntitySearch/${entity.entity_id}`} className="text-blue-400 hover:underline">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No entities found.
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
