"use client";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Grid3x3,
  List,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const locations = [
  { name: "Hostel", category: "Residential", capacity: "2300 students" },
  { name: "Cafeteria", category: "Dining", capacity: "700 seats" },
  { name: "Library", category: "Academic", capacity: "1000 seats" },
  { name: "LAB_101", category: "Laboratory", capacity: "130 students" },
  { name: "Gym", category: "Recreation", capacity: "500 students" },
  { name: "LAB", category: "Laboratory", capacity: "25 students" },
  { name: "Seminar Room", category: "Academic", capacity: "100 seats" },
  { name: "Auditorium", category: "Event Space", capacity: "300 seats" },
  { name: "Admin Lobby", category: "Administrative", capacity: "600 seats" },
  { name: "LAB_305", category: "Laboratory", capacity: "100 students" },
  { name: "LAB_102", category: "Laboratory", capacity: "15 students" },
  { name: "WORKSHOP", category: "Laboratory", capacity: "15 students" },
  { name: "LAB_A2", category: "Laboratory", capacity: "8 students" },
  { name: "Main Building", category: "Administrative", capacity: "300 seats" },
  { name: "LAB_A1", category: "Laboratory", capacity: "180 students" },
  { name: "Faculty Office", category: "Administrative", capacity: "500 seats" },
];

const categoryColors: Record<string, string> = {
  Residential: "from-blue-400/20 to-indigo-400/20",
  Dining: "from-green-400/20 to-emerald-400/20",
  Academic: "from-purple-400/20 to-violet-400/20",
  Laboratory: "from-red-400/20 to-rose-400/20",
  Recreation: "from-yellow-400/20 to-amber-400/20",
  "Event Space": "from-cyan-400/20 to-teal-400/20",
  Administrative: "from-gray-400/20 to-slate-400/20",
};

export default function LocationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", ...new Set(locations.map((loc) => loc.category))];
  const filteredLocations = locations.filter((location) => {
    const matchesSearch = location.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || location.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const router = useRouter();
  const handleLocationClick = (location: string) => {
    router.push(`/pages/indivisuallocation/${encodeURIComponent(location)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Enhanced Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-2xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-br from-sky-500 via-sky-600 to-cyan-500 p-3 rounded-2xl shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Campus Locations
                </h1>
                <p className="text-sm text-slate-400 font-medium">
                  Location Management System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/pages/crowdstatus")}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Users className="w-4 h-4 text-white" />
                <span className="hidden sm:inline text-white font-medium">
                  Crowd Summary View
                </span>
              </button>
              <button
                onClick={() => router.push("/pages/dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline text-slate-200 font-medium">
                  Back to Dashboard
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/30"
                      : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-sky-500 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-sky-500 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Location Grid/List */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }
        >
          {filteredLocations.map((location, index) => (
            <div
              key={location.name}
              onClick={() => handleLocationClick(location.name)}
              className={`group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl overflow-hidden hover:border-sky-500/50 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-sky-500/10 ${
                viewMode === "list" ? "flex items-center" : ""
              }`}
              style={{
                animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`,
              }}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                  categoryColors[location.category]
                } opacity-60 group-hover:opacity-100 transition-opacity`}
              ></div>

              <div
                className={
                  viewMode === "grid"
                    ? "p-6"
                    : "flex items-center gap-4 p-4 w-full"
                }
              >
                <div className="relative">
                  <div
                    className={`relative bg-gradient-to-br ${
                      categoryColors[location.category]
                    } p-4 rounded-xl shadow-lg group-hover:shadow-xl transition-all`}
                  >
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                      {location.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${
                        categoryColors[location.category]
                      } text-white shadow-sm`}
                    >
                      {location.category}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    Capacity: {location.capacity}
                  </p>
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/0 to-cyan-500/0 group-hover:from-sky-500/5 group-hover:to-cyan-500/5 transition-all pointer-events-none"></div>
            </div>
          ))}
        </div>

        {filteredLocations.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-12 inline-block">
              <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                No locations found
              </h3>
              <p className="text-slate-500">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}