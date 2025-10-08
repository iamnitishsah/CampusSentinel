"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
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

interface Alert {
  entity_id: string;
  name: string;
  email: string;
  last_seen: string;
  alert: string;
}

export default function DashboardPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceResult, setFaceResult] = useState<Entity | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);

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

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/alerts/');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      } else {
        console.error("Failed to fetch alerts:", res.statusText);
        setAlerts([]);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setAlerts([]);
    }
  }, []);
  useEffect(() => {
    fetchEntities(debouncedSearch);
  }, [debouncedSearch, fetchEntities]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleFaceIdentify = async () => {
    if (!faceFile) return;
    setFaceLoading(true);
    setFaceResult(null);
    setFaceError(null);
    const formData = new FormData();
    formData.append('file', faceFile);
    try {
      const res = await fetch('http://127.0.0.1:8001/identify-and-search/', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setFaceResult(data);
      } else {
        const errorData = await res.json();
        setFaceError(errorData.error || 'Failed to identify face');
      }
    } catch (err) {
      setFaceError('Error identifying face');
    } finally {
      setFaceLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto p-10">
        <h1 className="text-3xl font-bold mb-6 text-center">
          🏠 Campus Security Dashboard
        </h1>

        <div className="mb-8 bg-red-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">🚨 Alerts</h2>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.entity_id} className="p-4 bg-red-800 rounded-lg">
                  <p><strong>{alert.name}</strong> ({alert.entity_id})</p>
                  <p>{alert.alert}</p>
                  <p>Last seen: {new Date(alert.last_seen).toLocaleString()}</p>
                  <Link
                    href={`/pages/EntitySearch/${alert.entity_id}`}
                    className="text-blue-400 hover:underline mt-2 inline-block"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center">No alerts at this time.</p>
          )}
        </div>

        <div className="mb-8 flex justify-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, email..."
            className="w-full max-w-xl p-3 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />

        </div>

        <div className="mb-8 bg-slate-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">🔍 Face Identification</h2>
          <div className="flex justify-center gap-4 items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFaceFile(e.target.files?.[0] || null)}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleFaceIdentify}
              disabled={!faceFile || faceLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              {faceLoading ? 'Identifying...' : 'Identify Face'}
            </button>
          </div>
          {faceError && (
            <div className="mt-4 text-center text-red-400">{faceError}</div>
          )}
          {faceResult && (
            <div className="mt-4 p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Identified Entity:</h3>
              <p><strong>ID:</strong> {faceResult.entity_id}</p>
              <p><strong>Name:</strong> {faceResult.name}</p>
              <p><strong>Role:</strong> {faceResult.role}</p>
              <p><strong>Department:</strong> {faceResult.department}</p>
              <Link
                href={`/pages/EntitySearch/${faceResult.entity_id}`}
                className="text-blue-400 hover:underline mt-2 inline-block"
              >
                View Full Details
              </Link>
            </div>
          )}
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