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
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import TimePicker from "react-time-picker";
import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";

const BACKEND_CAPACITIES: Record<string, number> = {
    'Admin Lobby': 710,
    'Auditorium': 1360,
    'Hostel': 5000,
    'LAB_102': 15,
    'LAB': 30,
    'Library': 2150,
    'Seminar Room': 1800,
    'WORKSHOP': 20,
    'LAB_305': 30,
    'Gym': 1012,
    'LAB_101': 40,
    'Cafeteria': 1360,
    'LAB_A2': 12,
    'LAB_A1': 20,
    'Main Building': 30,
    'Faculty Office': 650
}
const DEFAULT_CAPACITY = 100; 
const PREDICTION_INTERVAL_MINS = 15; 

interface LocationData {
  location_name: string;
  capacity: number;
  predicted_occupancy: number;
  status: 'Overcrowded' | 'Underused' | 'Normal' | string;
  explanation: string;
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


const getStatusColorClass = (status: string): StatusConfig => {
  switch (status) {
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
    case "Normal":
    default:
      return {
        text: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        icon: CheckCircle,
      };
  }
};

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


const OccupancyGaugeChart: React.FC<OccupancyChartProps> = ({
  predictedCount,
  capacity,
  status,
}) => {
  const percentage = Math.min(
    100,
    Math.round((predictedCount / capacity) * 100)
  );

  const statusConfig = getStatusColorClass(status);
  const color = statusConfig.text.replace('text-', '#').replace('-400', ''); // Map to a simple hex for chart

  // Radial chart data requires the percentage value
  const chartData = [{ name: "Predicted", value: percentage, fill: color }];

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


// --- Helper Functions ---
const calculateEndTime = (startTime: string, intervalMins: number) => {
  if (!startTime) return "";
  const parts = startTime.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0; // Handle optional seconds

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
  const hours = now.getHours();
  // Snap to the next 15-minute interval
  const minutes = Math.ceil(now.getMinutes() / PREDICTION_INTERVAL_MINS) * PREDICTION_INTERVAL_MINS;
  
  const initialTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  const startHours = initialTime.getHours().toString().padStart(2, "0");
  const startMins = initialTime.getMinutes().toString().padStart(2, "0");
  const initialStartTime = `${startHours}:${startMins}:00`;

  const initialEndTime = calculateEndTime(initialStartTime, PREDICTION_INTERVAL_MINS);

  // Default to today's date
  const dateStr = now.toISOString().split("T")[0];

  return {
    date: dateStr,
    startTime: initialStartTime,
    endTime: initialEndTime,
  };
};


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

  const LOCATION_CAPACITY = BACKEND_CAPACITIES[locationName] || DEFAULT_CAPACITY;

  const initialTimes = getInitialTime();
  const [selectedDate, setSelectedDate] = useState(initialTimes.date);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endTime, setEndTime] = useState(initialTimes.endTime);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {

    const fullStartTime = startTime.length === 5 ? `${startTime}:00` : startTime; 
    setEndTime(calculateEndTime(fullStartTime, PREDICTION_INTERVAL_MINS));
  }, [startTime]);
  useEffect(() => {
    if (!BACKEND_CAPACITIES[locationName]) {
        setError(`Location "${locationName}" is not recognized in the backend configuration.`);
        setHasSubmitted(true); 
        return;
    }

    if (!hasSubmitted && !locationDetails) {
       
        fetchForecast(selectedDate, startTime);
    }
  }, [locationName, selectedDate, startTime]); 


  const fetchForecast = useCallback(async (date: string, time: string) => {
    if (!date || !time) {
      setError("Please select both date and time");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSubmitted(true);

    try {

      const fullStartTime = time.length === 5 ? `${time}:00` : time;
      const calculatedEndTime = calculateEndTime(fullStartTime, PREDICTION_INTERVAL_MINS);


const dateTimeString = `${date}T${calculatedEndTime}`;

const datee = new Date(dateTimeString);
const futureTimestamp = new Date(
  Date.UTC(
    datee.getFullYear(),
    datee.getMonth(),
    datee.getDate(),
    datee.getHours(),
    datee.getMinutes(),
    datee.getSeconds()
  )
).toISOString();



      const payload = {
        location_id: locationName,
        future_time: futureTimestamp,
      };

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      };

      const res = await fetch("http://127.0.0.1:8000/api/forecast/", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to fetch forecast data.`);
      }
      const data: {
        location_name: string;
        predicted_occupancy: number;
        status: 'Overcrowded' | 'Underused' | 'Normal' | string;
        explanation: string;
      } = await res.json();

      setLocationDetails({
        location_name: data.location_name,
        // CRITICAL FIX: Use the backend's known capacity for accurate FE visualization
        capacity: LOCATION_CAPACITY, 
        predicted_occupancy: data.predicted_occupancy,
        // Use the status label directly from the backend
        status: data.status,
        explanation: data.explanation,
      });
      
      setLoading(false);
      setStartTime(time); // Update state only on successful submission
      // setEndTime is handled by the useEffect on startTime change
      setSelectedDate(date);

    } catch (error) {
      console.error("Error fetching forecast:", error);
      setError("Failed to fetch forecast data. The backend returned an error or is unreachable. Check console for details.");
      setLoading(false);
    }
  }, [locationName, LOCATION_CAPACITY]);


  // Handler for user submission
  const handleSubmit = () => {
    if (selectedDate && startTime) {
      fetchForecast(selectedDate, startTime);
    } else {
      setError("Please select both date and time");
    }
  };


  // If the location is not in the hardcoded list, show an error.
  if (hasSubmitted && !BACKEND_CAPACITIES[locationName] && !error) {
    setError(`Location "${locationName}" is not a valid location in the backend system.`);
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
                  AI-powered crowd forecasting based on a fixed {PREDICTION_INTERVAL_MINS}-minute window.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TimeDisplay />
              <button
                onClick={() => router.push("/pages/dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline text-slate-200 font-medium">
                  back to Dashboard
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
            <h3 className="text-2xl font-bold text-white">
              Prediction Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">

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
    <Clock className="w-4 h-4 text-blue-400" />
    Start Time
  </label>

  <TimePicker
    disableClock
    format="HH:mm:ss"
    onChange={(value) => {
      if (value) setStartTime(value); 
    }}
    value={startTime.slice(0, 5)}
    className="w-full px-4 py-3 bg-slate-800/50 rounded-xl text-white font-mono text-lg transition-all"
    clearIcon={null}
    clockIcon={null}
  />
</div>

{/* End Time */}
<div className="space-y-2">
  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
    <Clock className="w-4 h-4 text-emerald-400" />
    End Time (Prediction Target)
  </label>
  <TimePicker
    disableClock
    format="HH:mm:ss"
    disabled
    value={endTime.slice(0, 5)} 
    className="w-full px-4 py-3 bg-slate-800/50 rounded-xl text-white font-mono text-lg cursor-not-allowed"
    clearIcon={null}
    clockIcon={null}
  />
</div>

            {/* Run Prediction Button Container */}
            <div className="flex items-end pt-4 lg:pt-0">
              <button
                onClick={handleSubmit}
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

        {hasSubmitted && locationDetails && !loading && !error && (
          <>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-all hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/30">
                    <TrendingUp className="w-7 h-7 text-cyan-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">
                  Predicted Count (by {endTime.slice(0, 5)})
                </p>
                <p className="text-3xl font-bold text-white">
                  {locationDetails.predicted_occupancy}
                </p>
              </div>

              {/* 2. Status */}
              <div
                className={`bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border ${
                  status?.border || ""
                } rounded-2xl p-6 shadow-xl transition-all hover:scale-105`}
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

              {/* 3. Max Capacity */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-all hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/30">
                    <Users className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-1">Max Capacity (BE Config)</p>
                <p className="text-3xl font-bold text-white">
                  {LOCATION_CAPACITY}
                </p>
              </div>

              {/* 4. Report Time */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-all hover:scale-105">
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
                      <ChevronDown
                        className={`w-5 h-5 text-cyan-400 transition-transform duration-300 ${
                          showExplanation ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    <span className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      AI Prediction Rationale (Explainable AI)
                    </span>
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    showExplanation
                      ? "max-h-96 opacity-100 mt-6"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">
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
                  <OccupancyGaugeChart
                    predictedCount={locationDetails.predicted_occupancy}
                    capacity={LOCATION_CAPACITY}
                    status={locationDetails.status}
                  />
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
                        {startTime.slice(0, 5)} - {endTime.slice(0, 5)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-1">
                        Max Capacity (BE)
                      </p>
                      <p className="text-lg font-mono text-white">
                        {LOCATION_CAPACITY}
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
                        Prediction for {endTime.slice(0, 5)} :
                        <span className="font-mono font-bold ml-1">
                          {locationDetails.predicted_occupancy}
                        </span> people (
                        {Math.min(
                          100,
                          Math.round(
                            (locationDetails.predicted_occupancy /
                              LOCATION_CAPACITY) *
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

        {/* Initial State - Before Submission (only if no error and no initial fetch success) */}
        {!hasSubmitted && !loading && !error && (
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