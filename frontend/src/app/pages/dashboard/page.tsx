"use client";

import {
  AlertTriangle,
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  Eye,
  Menu,
  Search,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

interface Face {
  entity_id: string;
  name: string;
  role: string;
  department: string;
  face_id?: string;
}

interface User {
  full_name: string;
  email: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [entityData, setEntityData] = useState<Entity | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [alertsSidebarOpen, setAlertsSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

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
      } else {
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
      const res = await fetch("http://localhost:8000/api/alerts/");
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

  const fetchUserProfile = async () => {
    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/users/me/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data.user.full_name);
        setUser({ full_name: data.user.full_name, email: data.user.email });
        console.log(data.user.full_name);
      } else {
        setError("Unauthorized. Please log in.");
      }
    } catch {
      setError("Error fetching user profile");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/pages/landing");
  };
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchEntities(debouncedSearch);
  }, [debouncedSearch, fetchEntities]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const fetchFace = async () => {
    if (!faceFile) return;
    setFaceLoading(true);
    setEntityData(null);
    setFaceError(null);
    const formData = new FormData();
    formData.append("file", faceFile);
    try {
      const res = await fetch("http://127.0.0.1:8001/identify-and-search/", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        console.log("API Response Data:", data);

        const { profile } = data;

        const entityData: Entity = {
          entity_id: profile.entity_id,
          name: profile.name,
          role: profile.role,
          department: profile.department,
          face_id: profile.face_id || undefined,
        };
        console.log("Entity ID:", entityData.entity_id);
        setEntityData(entityData);
      } else {
        const errorData = await res.json();
        setFaceError(errorData.error || "Failed to identify face");
      }
    } catch (err) {
      setFaceError("Error identifying face");
    } finally {
      setFaceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
         <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40">
      <div className="mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white font-serif">
                Campus Sentinel
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Admin Dashboard
              </p>
            </div>
          </div>

          {/* User Info Section */}
          <div className="hidden md:flex flex-col items-end gap-1">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="text-sm text-white font-medium">{user?.full_name}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">

            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:block px-4 py-2 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
            >
              Logout
            </button>

            {/* Alerts Button */}
            <button
              onClick={() => setAlertsSidebarOpen(!alertsSidebarOpen)}
              className="relative p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-300" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800/50 bg-slate-900/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800/50">
              <div className="text-sm text-white font-medium">{user?.full_name}</div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>

      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 transform transition-transform duration-300 z-50 ${
          alertsSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold">Security Alerts</h2>
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">
                {alerts.length}
              </span>
            </div>
            <button
              onClick={() => setAlertsSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.entity_id}
                  className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 hover:bg-red-950/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{alert.name}</h3>
                      <p className="text-sm text-slate-400">
                        {alert.entity_id}
                      </p>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 ml-2" />
                  </div>
                  <p className="text-sm text-red-300 mb-2">{alert.alert}</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Last seen: {new Date(alert.last_seen).toLocaleString()}
                  </p>
                  <Link
                    href={`/pages/EntitySearch/${alert.entity_id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No active alerts</p>
                <p className="text-sm text-slate-500 mt-1">
                  All systems operational
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {alertsSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setAlertsSidebarOpen(false)}
        />
      )}

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Entities</p>
                <p className="text-2xl font-bold text-white mt-1">{7000}</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <User className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Alerts</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {alerts.length}
                </p>
              </div>
              <div className="bg-red-500/10 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Face Enrolled</p>
                <p className="text-2xl font-bold text-white mt-1">{5000}</p>
              </div>
              <div className="bg-cyan-500/10 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-cyan-500" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">System Status</p>
                <p className="text-lg font-bold text-green-400 mt-1">
                  Operational
                </p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Search Entities</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, email..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-semibold">Face Identification</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFaceFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="face-upload"
                />
                <label
                  htmlFor="face-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm truncate">
                    {faceFile ? faceFile.name : "Choose image"}
                  </span>
                </label>
              </div>
              <button
                onClick={fetchFace}
                disabled={!faceFile || faceLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {faceLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin cursor-pointer" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Identify
                  </>
                )}
              </button>
            </div>

            {faceError && (
              <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-300 text-sm">
                {faceError}
              </div>
            )}

            {entityData && (
              <div className="mt-4 p-4 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-900/50 rounded-lg">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">
                  Identified Entity
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">ID:</span>
                    <span className="font-medium">{entityData.entity_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Name:</span>
                    <span className="font-medium">{entityData.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Role:</span>
                    <span className="font-medium">{entityData.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Department:</span>
                    <span className="font-medium">{entityData.department}</span>
                  </div>
                </div>
                <Link
                  href={`/pages/EntitySearch/${entityData.entity_id}`}
                  className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors mt-3 cursor-pointer"
                >
                  View Full Profile
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Entity Registry
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Entity ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Face ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {entities.length > 0 ? (
                    entities.map((entity, index) => (
                      <tr
                        key={entity.entity_id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-4 text-sm text-slate-300">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-200">
                          {entity.entity_id}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-200">
                          {entity.name}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs">
                            <Briefcase className="w-3 h-3" />
                            {entity.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          {entity.face_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-md text-xs">
                              <Eye className="w-3 h-3" />
                              {entity.face_id}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {entity.department || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <Link
                            href={`/pages/EntitySearch/${entity.entity_id}`}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            View
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No entities found</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Try adjusting your search
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
