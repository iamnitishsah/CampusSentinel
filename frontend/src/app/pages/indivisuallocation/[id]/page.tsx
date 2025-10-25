"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import TimePicker from "react-time-picker";
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// --- Type Definitions ---
interface LocationData {
  location_name: string;
  capacity: number;
  predicted_occupancy: number;
  status: string;
  explanation: string;
  current_occupancy: number;
}

interface StatusConfig {
  text: string;
  bg: string;
  border: string;
  icon: React.ComponentType<any>;
}

interface OccupancyChartProps {
  predictedCount: number;
  capacity: number;
  status: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  predictedCount: number;
  status: string;
}

// --- Real-Time Clock Component ---
const TimeDisplay: React.FC = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/50 shadow-lg">
      <Clock className="w-5 h-5 text-emerald-400" />
      <span className="font-mono text-lg font-semibold text-white">{time}</span>
    </div>
  );
};

// --- Location Capacities (MOCK/DEMO DATA) ---
const locationCapacities: Record<string, number> = {
  Hostel: 5596,
  Cafeteria: 6153,
  Library: 1951,
  LAB_101: 1012,
  Gym: 2255,
  LAB: 92,
  "Seminar Room": 360,
  Auditorium: 644,
  "Admin Lobby": 728,
  LAB_305: 1916,
  LAB_102: 33,
  WORKSHOP: 48,
  LAB_A2: 38,
  "Main Building": 776,
  LAB_A1: 1871,
  "Faculty Office": 681,
};

// --- Occupancy Gauge Chart ---
const OccupancyGaugeChart: React.FC<OccupancyChartProps> = ({
  predictedCount,
  capacity,
  status,
}) => {
  const percentage = Math.min(
    100,
    Math.round((predictedCount / capacity) * 100)
  );

  let color = "#10b981"; // green
  if (status === "Overcrowded" || status === "CRITICAL") {
    color = "#ef4444"; // red
  } else if (status === "Underused") {
    color = "#3b82f6"; // blue
  }

  // Radial chart data requires the percentage value
  const chartData = [{ name: "Predicted", value: percentage, fill: color }];

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    predictedCount,
    status,
  }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      if (dataPoint.name === "Predicted") {
        return (
          <div className="p-4 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl">
            <p className="font-bold text-white mb-1">
              Predicted: {dataPoint.value}%
            </p>
            <p className="text-slate-300 text-sm">
              Count: {predictedCount} people
            </p>
            <p className="text-slate-300 text-sm">Status: {status}</p>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="relative h-80 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={45}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar dataKey="value" cornerRadius={15} />
          <Tooltip
            content={
              <CustomTooltip predictedCount={predictedCount} status={status} />
            }
          />
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-5xl font-bold"
            fill={color}
          >
            {percentage}%
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm"
            fill="#94a3b8"
          >
            Occupancy
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-3 right-3 bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400">Max: {capacity}</p>
      </div>
    </div>
  );
};

// --- Helper for default times ---
const calculateEndTime = (startTime: string, intervalMins: number) => {
  if (!startTime) return "";
  // Split expects HH:MM:SS or HH:MM
  const parts = startTime.split(":").map(Number);
  const hours = parts[0];
  const minutes = parts[1];

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  // Add the interval (15 minutes)
  const futureTime = new Date(date.getTime() + intervalMins * 60000);

  const endHours = futureTime.getHours().toString().padStart(2, "0");
  const endMins = futureTime.getMinutes().toString().padStart(2, "0");

  return `${endHours}:${endMins}`;
};

const getInitialTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = Math.floor(now.getMinutes() / 15) * 15;
  const startMins = minutes.toString().padStart(2, "0");

  const initialStartTime = `${hours}:${startMins}`;
  const initialEndTime = calculateEndTime(initialStartTime, 15);

  // Default to today's date
  const dateStr = now.toISOString().split("T")[0];

  return {
    date: dateStr,
    startTime: initialStartTime,
    endTime: initialEndTime,
  };
};

// --- Main Component ---

export default function IndividualLocationPage() {
  const params = useParams();
  const router = useRouter();
  // Get location name from URL parameter
  const locationName = decodeURIComponent(params.id as string);

  const [locationDetails, setLocationDetails] = useState<LocationData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const intervalMins = 15;

  // --- Date and Time States ---
  const initialTimes = getInitialTime();
  const [selectedDate, setSelectedDate] = useState(initialTimes.date);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endTime, setEndTime] = useState(initialTimes.endTime);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // --- Current Occupancy (Mocked from current state) ---
  const [currentOccupancy, setCurrentOccupancy] = useState(0);

  // 1. Effect to automatically calculate endTime whenever startTime changes
  useEffect(() => {
    setEndTime(calculateEndTime(startTime, intervalMins));
  }, [startTime]);

  // 2. Initial Data Fetch (Run on load)
  useEffect(() => {
    // Use a local helper to run the fetch when needed, as fetchForecast is part of useCallback
    const runInitialFetch = async () => {
      // Initial fetch logic to populate the page on load
      if (!hasSubmitted && !locationDetails) {
        await fetchForecast();
      }
    };
    runInitialFetch();
  }, [locationName]);

  const getStatusColorClass = (status: string): StatusConfig => {
    switch (status) {
      case "CRITICAL":
      case "Overcrowded":
        return {
          text: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          icon: AlertTriangle,
        };
      case "Underused":
        return {
          text: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          icon: Users,
        };
      default:
        return {
          text: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          icon: CheckCircle,
        };
    }
  };

  const fetchForecast = useCallback(async () => {
    if (!selectedDate || !startTime) {
      setError("Please select both date and time");
      return;
    }

    setLoading(true);
    setError(null);

    const CAPACITY = locationCapacities[locationName] || 100;

    // --- Mocking Current Occupancy (Updated to reflect a new state) ---
    const current = Math.floor(CAPACITY * (0.1 + Math.random() * 0.7));
    setCurrentOccupancy(current);
    // -------------------------------------------------------------------

    let latestPrediction = 0;
    let latestStatus = "Normal";
    let fullExplanation = "Explanation pending...";

    try {
      // Construct times
      const now = new Date(selectedDate + "T00:00:00");
      const startDateTime = new Date(now.toDateString() + " " + startTime);
      const endDateTime = new Date(now.toDateString() + " " + endTime);

      const futureTimestamp = endDateTime
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");

      const payload = {
        location_name: locationName,
        future_timestamp: futureTimestamp,
      };

      /*
      // ** UNCOMMENT FOR REAL BACKEND TESTING **
      const res = await fetch("http://127.0.0.1:8000/api/forecast/space/", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
      });

      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Failed to fetch forecast data.`);
      }
      const data: { location_name: string, predicted_occupancy: number, status: string, capacity: number } = await res.json();

      latestPrediction = data.predicted_occupancy;
      latestStatus = data.status;
      // We would also fetch the explanation from a dedicated AI endpoint here
      */

      // --- MOCK DATA GENERATION ---
      const predictionFactor = 0.6 + Math.random() * 0.6;
      latestPrediction = Math.floor(CAPACITY * predictionFactor);

      if (latestPrediction > CAPACITY * 1.05) latestStatus = "CRITICAL";
      else if (latestPrediction > CAPACITY * 0.8) latestStatus = "Overcrowded";
      else if (latestPrediction < CAPACITY * 0.3) latestStatus = "Underused";
      else latestStatus = "Normal";

      // Generate mock explanation based on the predicted status
      fullExplanation = `The AI model, utilizing deep time-series analysis (Random Forest Regressor), projects **${latestPrediction} occupants** at ${endTime} on ${new Date(
        selectedDate
      ).toLocaleDateString("en-US", {
        weekday: "long",
      })}. This prediction results in a **${latestStatus}** status. The rationale is based on correlation with historical class schedules and known movement choke points at this specific time slot, indicating a predictable peak or trough in campus traffic.`;
      // --- END MOCK DATA GENERATION ---

      setTimeout(() => {
        setLocationDetails({
          location_name: locationName,
          capacity: CAPACITY,
          predicted_occupancy: latestPrediction,
          status: latestStatus,
          explanation: fullExplanation,
          current_occupancy: current,
        });
        setHasSubmitted(true);
        setLoading(false);
      }, 1000); // Simulate API latency
    } catch (error) {
      console.error("Error fetching forecast:", error);
      setError("Failed to fetch forecast data. Please try again.");
      setLoading(false);
    }
  }, [locationName, selectedDate, startTime, endTime]);

  // If page is loading for the first time, show loading screen
  if (!hasSubmitted && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const status = locationDetails
    ? getStatusColorClass(locationDetails.status)
    : null;
  const StatusIcon = status?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-2xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-2.5 rounded-xl border border-cyan-500/30">
                  <MapPin className="w-7 h-7 text-cyan-400" />
                </div>
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white">
                  {locationName}
                </h2>
                <p className="text-slate-400 mt-1">
                  Real-time occupancy monitoring and AI-powered forecasting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TimeDisplay /> {/* Integrated Real-Time Clock */}
              <button
                onClick={() => router.push("/pages/dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline text-slate-200 font-medium">
                  Dashboard
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date & Time Input Section */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
            <h3 className="text-2xl font-bold text-white">
              Prediction Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            {/* Date Picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Prediction Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                Start Time
              </label>

              <TimePicker
                disableClock
                format="HH:mm:ss"
                onChange={(value) => {
                  if (value) setStartTime(value); // value already in HH:mm:ss format
                }}
                value={startTime}
                className="w-full px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl text-slate-400 font-mono text-lg transition-all"
                clearIcon={null}
                clockIcon={null}
              />
            </div>

            {/* End Time (Auto-calculated) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                End Time
              </label>
              <input
                type="time"
                step="1"
                value={endTime}
                readOnly
                disabled
                className="w-full px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl text-slate-400 font-mono text-lg cursor-not-allowed"
              />
            </div>

            {/* Run Prediction Button Container */}
            <div className="flex items-end pt-4 lg:pt-0">
              <button
                onClick={fetchForecast}
                disabled={loading || !selectedDate || !startTime}
                className="w-full h-12 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running Prediction...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Run AI Prediction
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section - Only show after submission */}
        {hasSubmitted && locationDetails && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* 2. Predicted Occupancy */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/30">
                    <TrendingUp className="w-7 h-7 text-cyan-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">
                  Predicted Count (by {endTime})
                </p>
                <p className="text-3xl font-bold text-white">
                  {locationDetails.predicted_occupancy}
                </p>
              </div>

              {/* 3. Status */}
              <div
                className={`bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border ${
                  status?.border || ""
                } rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`${status?.bg || ""} p-3 rounded-xl border ${
                      status?.border || ""
                    }`}
                  >
                    {StatusIcon && (
                      <StatusIcon className={`w-7 h-7 ${status?.text || ""}`} />
                    )}
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">Forecasted Status</p>
                <p className={`text-2xl font-bold ${status?.text || ""}`}>
                  {locationDetails.status}
                </p>
              </div>

              {/* 4. Report Time */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
                    <Clock className="w-7 h-7 text-emerald-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">Prediction Run At</p>
                <p className="text-xl font-mono font-bold text-white">
                  {new Date().toLocaleTimeString("en-US", { hour12: false })}
                </p>
              </div>
            </div>

            {/* XAI Explanation Section */}
            {locationDetails.explanation && (
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 mb-8">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
                      <Eye className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      AI Prediction Rationale (Explainable AI)
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                      showExplanation ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    showExplanation
                      ? "max-h-96 opacity-100 mt-6"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    <p className="text-slate-300 leading-relaxed">
                      {locationDetails.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Occupancy Visualization */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-2 rounded-xl border border-cyan-500/30">
                  <Activity className="w-6 h-6 text-cyan-400" />
                </div>
                Predicted Occupancy Gauge
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gauge Chart */}
                <div className="flex items-center justify-center">
                  {locationDetails.predicted_occupancy > 0 ? (
                    <OccupancyGaugeChart
                      predictedCount={locationDetails.predicted_occupancy}
                      capacity={locationDetails.capacity}
                      status={locationDetails.status}
                    />
                  ) : (
                    <div className="h-72 flex items-center justify-center text-slate-500">
                      <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p>No valid forecast data available.</p>
                    </div>
                  )}
                </div>

                {/* Prediction Details/Legend */}
                <div className="space-y-4 pt-6 lg:pt-0 lg:border-l lg:border-slate-700/50 lg:pl-8">
                  <h4 className="text-lg font-semibold text-white">
                    Summary Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">Time Window</p>
                      <p className="text-lg font-mono text-cyan-400">
                        {startTime} - {endTime}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">
                        Max Capacity
                      </p>
                      <p className="text-lg font-mono text-white">
                        {locationDetails.capacity}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-4 p-3 bg-slate-800/30 rounded-xl border ${
                      status?.border || ""
                    }`}
                  >
                    <div
                      className={`w-3 h-3 mt-1.5 rounded-full ${
                        status?.text?.replace("text-", "bg-") || ""
                      } flex-shrink-0`}
                    />
                    <div>
                      <p className="font-semibold text-white mb-1">
                        Forecasted Count
                      </p>
                      <p className="text-sm text-slate-400">
                        Prediction for {endTime} :
                        {locationDetails.predicted_occupancy} people (
                        {Math.min(
                          100,
                          Math.round(
                            (locationDetails.predicted_occupancy /
                              locationDetails.capacity) *
                              100
                          )
                        )}
                        %).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Initial State - Before Submission */}
        {!hasSubmitted && !loading && (
          <div className="text-center py-16">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-12 inline-block">
              <TrendingUp className="w-20 h-20 text-slate-600 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-slate-400 mb-3">
                Ready for Prediction
              </h3>
              <p className="text-slate-500 max-w-md">
                Select a date and time above, then click "Run AI Prediction" to
                generate occupancy forecasts.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
