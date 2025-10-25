"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Search,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import TimePicker from "react-time-picker";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND_CAPACITIES: Record<string, number> = {
    'Admin Lobby': 600,
    'Auditorium': 300,
    'Hostel': 2300,
    'LAB_102': 15,
    'LAB': 25,
    'Library': 1000,
    'Seminar Room': 100,
    'WORKSHOP': 15,
    'LAB_305': 100,
    'Gym': 500,
    'LAB_101': 130,
    'Cafeteria': 700,
    'LAB_A2': 8,
    'LAB_A1': 180,
    'Main Building': 300,
    'Faculty Office': 500
};

const PREDICTION_INTERVAL_MINS = 15;
const API_URL = "http://127.0.0.1:8000/api/forecast/";

// --- Type Definitions and Constants ---

interface LocationStatus {
  name: string;
  status: "Normal" | "Overcrowded" | "Underused" | "Loading" | "Error";
  predictedCount: number;
  capacity: number;
  linkId: string;
  position: { x: number; y: number; rotation?: number };
  size: { width: number; height: number };
}

interface StatusConfig {
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  icon: React.ComponentType<any>;
}

// Keeping the mock layout for map visualization, as its logic is frontend-only
const campusLayout: Record<string, { 
  x: number; 
  y: number; 
  rotation?: number; 
  width: number; 
  height: number; 
  category: string; 
}> = {
    // 🏢 Administrative Zone (Top-left)
    "Main Building": { x: 50, y: 50, width: 220, height: 185, rotation: 0, category: "Administrative" },
    "Admin Lobby": { x: 30, y: 18, width: 130, height: 175, rotation: -1, category: "Administrative" },
    "Faculty Office": { x: 40, y: 26, width: 150, height: 180, rotation: 1, category: "Administrative" },

    // 🎓 Academic Zone (Top-right)
    "Library": { x: 33, y: 60, width: 200, height: 185, rotation: -1, category: "Academic" },
    "Seminar Room": { x: 55, y: 15, width: 200, height: 190, rotation: 1, category: "Academic" },

    // 🧪 Laboratory Zone (Middle-right)
    "LAB_101": { x: 65, y: 40, width: 150, height: 175, rotation: -2, category: "Laboratory" },
    "LAB_102": { x: 70, y: 64, width: 130, height: 180, rotation: 1, category: "Laboratory" },
    "LAB_305": { x: 85, y: 45, width: 180, height: 185, rotation: 3, category: "Laboratory" },
    "LAB_A1": { x: 80, y: 80, width: 140, height: 185, rotation: 1, category: "Laboratory" },
    "LAB_A2": { x: 90, y: 66, width: 120, height: 175, rotation: -1, category: "Laboratory" },
    "LAB": { x: 90, y: 22, width: 130, height: 180, rotation: -2, category: "Laboratory" },
    "WORKSHOP": { x: 75, y: 18, width: 140, height: 175 ,rotation: 1, category: "Laboratory" },

    // 🏠 Residential Zone (Bottom-left)
    "Hostel": { x: 17, y: 45, width: 220, height: 160, rotation: -2, category: "Residential" },

    // 🍽️ Dining & Recreation Zone (Bottom-middle)
    "Cafeteria": { x: 15, y: 75, width: 160, height: 190, rotation: -2,  category: "Dining" },
    "Gym": { x: 10, y: 15, width: 180, height: 180, rotation: 0, category: "Recreation" },

    // 🎭 Event Zone (Bottom-right)
    "Auditorium": { x: 55, y: 74, width: 210, height: 190, rotation: -1, category: "Event Space" },
};


// --- Helper Functions ---
const calculateEndTime = (startTime: string, intervalMins: number) => {
  if (!startTime) return "";
  const parts = startTime.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  const futureTime = new Date(date.getTime() + intervalMins * 60000);

  const endHours = futureTime.getHours().toString().padStart(2, "0");
  const endMins = futureTime.getMinutes().toString().padStart(2, "0");
  const endSecs = futureTime.getSeconds().toString().padStart(2, "0");

  return `${endHours}:${endMins}:${endSecs}`;
};

const getInitialTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  // Snap to the next 15-minute interval
  const minutes = Math.ceil(now.getMinutes() / PREDICTION_INTERVAL_MINS) * PREDICTION_INTERVAL_MINS;
  const initialTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes, 0, 0);

  const startHours = initialTime.getHours().toString().padStart(2, "0");
  const startMins = initialTime.getMinutes().toString().padStart(2, "0");
  const initialStartTime = `${startHours}:${startMins}:00`;

  const initialEndTime = calculateEndTime(initialStartTime, PREDICTION_INTERVAL_MINS);
  const dateStr = now.toISOString().split("T")[0];

  return {
    date: dateStr,
    startTime: initialStartTime,
    endTime: initialEndTime,
  };
};

const getStatusConfig = (status: LocationStatus["status"]): StatusConfig => {
  switch (status) {
    case "Overcrowded":
      return {
        textClass: "text-red-400",
        bgClass: "bg-red-500/20",
        borderClass: "border-red-500",
        glowClass: "shadow-red-500/50",
        icon: AlertTriangle,
      };
    case "Underused":
      return {
        textClass: "text-blue-400",
        bgClass: "bg-blue-500/20",
        borderClass: "border-blue-500",
        glowClass: "shadow-blue-500/50",
        icon: Users,
      };
    case "Error":
      return {
        textClass: "text-yellow-400",
        bgClass: "bg-yellow-500/20",
        borderClass: "border-yellow-500",
        glowClass: "shadow-yellow-500/50",
        icon: AlertTriangle,
      };
    case "Normal":
    default:
      return {
        textClass: "text-emerald-400",
        bgClass: "bg-emerald-500/20",
        borderClass: "border-emerald-500",
        glowClass: "shadow-emerald-500/50",
        icon: CheckCircle,
      };
  }
};

// --- API FETCH Logic (Sequential Calls) ---
const fetchAllForecasts = async (
  date: string,
  startTime: string,
  setLoading: (b: boolean) => void,
  setError: (s: string | null) => void
): Promise<LocationStatus[]> => {
  setLoading(true);
  setError(null);
  const allLocationNames = Object.keys(BACKEND_CAPACITIES);
  const results: LocationStatus[] = [];
  const errors: string[] = [];
  
  // Calculate the target end time (future_time for the API)
  const calculatedEndTime = calculateEndTime(startTime, PREDICTION_INTERVAL_MINS);
  const dateTimeString = `${date}T${calculatedEndTime}`;
  const futureTimestamp = new Date(dateTimeString).toISOString().replace(/\.\d{3}Z$/, "Z");
  
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("access")}`,
  };


  for (const locationName of allLocationNames) {
    const capacity = BACKEND_CAPACITIES[locationName] || 0;
    const layout = campusLayout[locationName] || { x: 50, y: 50, width: 100, height: 80 };
    
    try {
      const payload = {
        location_id: locationName,
        future_time: futureTimestamp,
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // If API returns an error for a specific location (e.g., no data), mark it as Error
        const errData = await res.json();
        throw new Error(errData.error || `Status ${res.status}`);
      }
      
      const data: {
        location_name: string;
        predicted_occupancy: number;
        status: 'Overcrowded' | 'Underused' | 'Normal';
        explanation: string;
      } = await res.json();

      results.push({
        name: locationName,
        status: data.status, // Use the status provided directly by the backend
        predictedCount: data.predicted_occupancy,
        capacity,
        linkId: encodeURIComponent(locationName),
        position: { x: layout.x, y: layout.y, rotation: layout.rotation },
        size: { width: layout.width, height: layout.height },
      });
      
    } catch (err) {
        // Handle fetch/API errors for this specific location
        errors.push(`'${locationName}' failed: ${(err as Error).message}`);
        results.push({
            name: locationName,
            status: "Error",
            predictedCount: 0,
            capacity,
            linkId: encodeURIComponent(locationName),
            position: { x: layout.x, y: layout.y, rotation: layout.rotation },
            size: { width: layout.width, height: layout.height },
        });
    }
  }
  
  setLoading(false);
  
  if (errors.length > 0) {
      // Report main error summary if multiple failed, otherwise clear error
      setError(`Prediction complete, but ${errors.length} locations failed to forecast. See console for details.`);
      console.error("Location Fetch Errors:", errors);
  } else {
      setError(null);
  }

  return results;
};

const TimeDisplay = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="text-sm text-slate-300 font-mono">
      {time.toLocaleTimeString()}
    </div>
  );
};

// --- Main Component ---
export default function CrowdStatusPage() {
  const router = useRouter(); // Initialize router
  const initialTimes = getInitialTime();

  const [selectedDate, setSelectedDate] = useState(initialTimes.date);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endTime, setEndTime] = useState(initialTimes.endTime);
  const [locationStatuses, setLocationStatuses] = useState<LocationStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    if (startTime) {
      // The TimePicker returns HH:mm, so we ensure full format for calculation
      const fullStartTime = startTime.length === 5 ? `${startTime}:00` : startTime; 
      const newEnd = calculateEndTime(fullStartTime, PREDICTION_INTERVAL_MINS);
      setEndTime(newEnd);
    }
  }, [startTime]);

  const handleRunPrediction = useCallback(async () => {
    if (!selectedDate || !startTime) {
      setError("Please select both date and start time.");
      return;
    }
    setError(null);

    const results = await fetchAllForecasts(
      selectedDate,
      startTime,
      setLoading,
      setError
    );
    setLocationStatuses(results);
  }, [selectedDate, startTime]);

  // Initial fetch on component mount
  useEffect(() => {
    handleRunPrediction();
  }, [handleRunPrediction]);


  const handleLocationClick = (linkId: string) => {
    // Redirect to the individual location prediction page
    router.push(`/pages/location/${linkId}`); 
  };

  const displayEndTime = endTime
    ? endTime.split(":").slice(0, 2).join(":")
    : "--:--";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-2xl">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl blur-lg opacity-40" />
               <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Campus Location
                </h1>
                <p className="text-sm text-slate-400 font-medium">
                  3D Spatial Overview ({PREDICTION_INTERVAL_MINS}-min Forecast)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TimeDisplay />
              {/* Back button (Placeholder, assuming this page is a dashboard item) */}
              <button
                onClick={() => router.push("/pages/dashboard")}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700/70 transition-colors"
              >
                  <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Controls */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-6 h-6 text-cyan-400" />
            <h3 className="text-2xl font-bold text-white">
              Select Prediction Time
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 items-end">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Prediction Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white font-mono"
              />
            </div>


            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                Start Time
              </label>

              <TimePicker
                disableClock
                format="HH:mm"
                onChange={(value) => {
                  if (value) setStartTime(value); // HH:mm
                }}
                value={startTime.slice(0, 5)}
                className="w-full px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl text-slate-400 font-mono text-lg transition-all"
                clearIcon={null}
                clockIcon={null}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                To Time (Target)
              </label>
              <input
                type="text"
                readOnly
                value={displayEndTime}
                className="w-full px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl text-slate-400 font-mono text-lg cursor-not-allowed"
              />
            </div>

            <div className="h-full flex items-end col-span-2 lg:col-span-2">
              <button
                onClick={handleRunPrediction}
                disabled={loading || !selectedDate || !startTime}
                className="w-full h-12 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Forecast All
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* 3D Campus Map */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-10 h-6 text-orange-400" />
            <h3 className="text-2xl font-bold text-white">
              Campus 3D Map View
            </h3>
            <span className="ml-auto text-slate-400 text-sm">
              {new Date(selectedDate).toLocaleDateString()} Forecast for {displayEndTime}
            </span>
          </div>

          {/* Map Container */}
          <div className="relative w-full h-[1000px] bg-gradient-to-br from-green-900/20 via-green-800/10 to-emerald-900/20 rounded-3xl border-2 border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Buildings */}
            {locationStatuses.map((location) => {
              const statusConfig = getStatusConfig(location.status);
              const StatusIcon = statusConfig.icon;
              const isSelected = selectedLocation === location.name;

              return (
                <div
                  key={location.name}
                  className="absolute transition-all duration-500 ease-out"
                  style={{
                    left: `${location.position.x}%`,
                    top: `${location.position.y}%`,
                    width: `${location.size.width}px`,
                    height: `${location.size.height}px`,
                    transform: `translate(-50%, -50%) rotate(${location.position.rotation || 0}deg) ${isSelected ? 'scale(1.1)' : 'scale(1)'}`,
                    zIndex: isSelected ? 50 : 10,
                  }}
                  onMouseEnter={() => setSelectedLocation(location.name)}
                  onMouseLeave={() => setSelectedLocation(null)}
                  onClick={() => handleLocationClick(location.linkId)} // Redirect on click
                >
             
                  
                  {/* Building structure with 3D effect */}
                  <div className={`relative h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border-2 ${statusConfig.borderClass}  ${statusConfig.glowClass} cursor-pointer transition-all duration-500 hover:shadow-3xl`}>
                    {/* Top face (3D effect) */}
                    <div 
                      className={`absolute -top-2 left-2 right-0 h-2 bg-gradient-to-r from-slate-700 to-slate-600 rounded-t-lg border-l border-r ${statusConfig.borderClass} opacity-70`}
                      style={{
                        transform: 'skewY(-2deg)',
                      }}
                    />
                    
                    {/* Side face (3D effect) */}
                    <div 
                      className={`absolute -right-2 top-2 bottom-0 w-2 bg-gradient-to-b from-slate-700 to-slate-800 rounded-r-lg border-t border-b ${statusConfig.borderClass} opacity-70`}
                      style={{
                        transform: 'skewX(-2deg)',
                      }}
                    />

                    {/* Building content */}
                    <div className="relative h-full p-3 flex flex-col justify-between">
                      {/* Status indicator */}
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-white font-bold text-xs leading-tight">
                          {location.name}
                        </h4>
                        <div className={`${statusConfig.bgClass} p-1.5 rounded-lg flex-shrink-0`}>
                          <StatusIcon className={`w-3 h-3 ${statusConfig.textClass}`} />
                        </div>
                      </div>

                    

                      {/* Status info */}
                      {location.status === "Loading" ? (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <div className="w-2 h-2 border border-slate-500/50 border-t-slate-300 rounded-full animate-spin" />
                          <span className="text-[10px]">Loading...</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className={`text-lg font-extrabold ${statusConfig.textClass}`}>
                            {location.predictedCount}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            / {location.capacity}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hover info panel */}
                    {isSelected && (
                      <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-slate-700 rounded-xl p-4 min-w-[200px] shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                        <div className="text-center">
                          <h5 className="text-white font-bold mb-2">{location.name}</h5>
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-300">
                              Predicted: <span className={`font-bold ${statusConfig.textClass}`}>{location.predictedCount}</span>
                            </p>
                            <p className="text-slate-400">
                              Capacity: {location.capacity}
                            </p>
                            <p className={`font-semibold ${statusConfig.textClass}`}>
                              {location.status}
                            </p>
                          </div>
                        </div>
                        {/* Arrow pointing down */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b-2 border-r-2 border-slate-700 transform rotate-45" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex justify-center gap-8 p-6 bg-slate-900/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
            <span className="text-sm font-medium text-slate-300">Overcrowded</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" />
            <span className="text-sm font-medium text-slate-300">Normal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
            <span className="text-sm font-medium text-slate-300">Underused</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50" />
            <span className="text-sm font-medium text-slate-300">Error/No Data</span>
          </div>
        </div>
      </main>
    </div>
  );
}