// frontend/src/app/pages/EntitySearch/[id]/page.tsx (Fixed Pie Chart Label Error)

"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import './calender.css'
import "react-calendar/dist/Calendar.css";
import {
    Activity,
    AlertCircle,
    BookOpen,
    Calendar as CalendarIcon,
    Camera,
    Clock,
    CreditCard,
    Database,
    Eye,
    FileText,
    FlaskConical,
    MapPin,
    Shield,
    TrendingUp,
    User,
    Wifi,
    ChevronDown, 
    PieChart as PieChartIcon 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"; 
import TimelineItem from "./TimelineItem"; 

// --- Type Definitions (Added for Pie Chart Props) ---

// Defining the specific properties used from the recharts payload
interface CustomLabelProps {
    name: string;
    value: number;
    percent: number;
    // Recharts passes many other SVG properties which are ignored here
}

type Profile = {
    entity_id: string;
    name: string;
    role: string;
    email?: string;
    department?: string;
    student_id?: string;
    staff_id?: string;
    card_id?: string;
    face_id?: string;
    device_hash?: string;
    created_at: string;
    last_seen?: string;
};

type TimelineEvent = {
    event_id: string;
    event_type: string;
    timestamp: string;
    location?: string;
    confidence: number;
    created_at: string;
    entity: Profile | null;
    wifi_logs: any[];
    card_swipes: any[];
    cctv_frames: any[];
    notes: any[];
    lab_bookings: any[];
    library_checkout: any[];
};

// --- Utility Functions ---

const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const groupEventsByHour = (events: TimelineEvent[]) => {
    const grouped: { [key: string]: TimelineEvent[] } = {};
    events.forEach((event) => {
        const date = new Date(event.timestamp);
        const hour = date.getUTCHours(); 
        const hourKey = `${hour.toString().padStart(2, "0")}:00`;
        if (!grouped[hourKey]) grouped[hourKey] = [];
        grouped[hourKey].push(event);
    });

    for (const key in grouped) {
        grouped[key].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    return grouped;
};

const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// --- PIE CHART UTILITIES ---
const CHART_COLORS = {
    "wifi_logs": "#3b82f6",     // blue-500
    "card_swipes": "#10b981",   // green-500
    "cctv_frames": "#a855f7",   // purple-500
    "notes": "#f59e0b",         // yellow-500
    "lab_bookings": "#f97316",  // orange-500
    "library_checkout": "#14b8a6", // teal-500
    "default": "#64748b"        // slate-500
};

const getEventDistributionData = (timeline: TimelineEvent[]) => {
    if (!timeline || timeline.length === 0) return [];

    const counts: { [key: string]: number } = {};

    // 1. Count events by type
    timeline.forEach(event => {
        const type = event.event_type;
        counts[type] = (counts[type] || 0) + 1;
    });

    // 2. Format for Recharts Pie
    return Object.entries(counts).map(([type, value]) => ({
        name: formatEventType(type),
        value: value,
        color: CHART_COLORS[type as keyof typeof CHART_COLORS] || CHART_COLORS.default,
    }));
};

// --- Custom Tooltip for Recharts ---
const CustomTooltip = ({ active, payload, totalEvents }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-slate-700/90 backdrop-blur border border-slate-600 rounded-lg shadow-xl text-white text-sm">
          <p className="font-bold">{data.name}</p>
          <p>Events: {data.value}</p>
          <p>Percentage: {(data.value / totalEvents * 100).toFixed(1)}%</p>
        </div>
      );
    }
  
    return null;
  };

// --- Main Component ---

export default function EntityPage() {
    const params = useParams() as { id?: string };
    const entityId = params?.id || "";
    const [profile, setProfile] = useState<Profile | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [summary, setSummary] = useState<string>("");
    const [predict, setPredict] = useState<{
        predictedLocation: string;
        explanation: string;
        pastActivities: any[];
    } | null>(null);
    const [showPredictionDetails, setShowPredictionDetails] = useState(false); 

    const onDateChange = (value: any) => {
        if (value instanceof Date) {
            setSelectedDate(value);
        }
    };

   useEffect(() => {
  const fetchAll = async () => {
    if (!entityId || !selectedDate) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("access");

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // 1. Fetch Profile
      const pRes = await fetch(`http://127.0.0.1:8000/api/entities/${entityId}/`, {
        headers: authHeaders,
      });
      if (pRes.ok) {
        setProfile(await pRes.json());
      } else {
        setProfile(null); 
        console.error("Profile not found:", pRes.statusText);
      }

      // 2. Fetch Timeline & Summary
      const formattedDate = formatDateForAPI(selectedDate);
      const tRes = await fetch(
        `http://127.0.0.1:8000/api/entities/${entityId}/timeline/?date=${formattedDate}`,
        { headers: authHeaders }
      );
      if (tRes.ok) {
        const data = await tRes.json();
        setTimeline(data.timeline || []);
        setSummary(data.summary || "");
      } else {
        setTimeline([]);
        setSummary("");
        console.warn("Timeline fetch failed:", tRes.statusText);
      }

      // 3. Fetch Prediction
      const predictRes = await fetch("http://127.0.0.1:8000/api/predict/", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ entity_id: entityId }),
      });
      if (predictRes.ok) {
        const predictJson = await predictRes.json();
        setPredict({
          predictedLocation: predictJson.predicted_location,
          explanation: predictJson.explanation,
          pastActivities: predictJson.past_activities,
        });
      } else {
        setPredict(null);
        console.warn("Prediction fetch failed:", predictRes.statusText);
      }
    } catch (err) {
      console.error("Error fetching entity data:", err);
      setProfile(null); 
      setTimeline([]);
      setSummary("");
      setPredict(null);
    } finally {
      setLoading(false);
    }
  };

  fetchAll();
}, [entityId, selectedDate]);


    const groupedEvents = groupEventsByHour(timeline);
    const activityData = getEventDistributionData(timeline);
    const totalEvents = timeline.length;

    if (loading) {
         return (
             <div className="min-h-screen flex items-center justify-center bg-slate-950">
                 <div className="text-center">
                     <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
                     <p className="text-slate-400">Loading security data...</p>
                 </div>
             </div>
         );
     }
     
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center bg-slate-900/50 backdrop-blur-sm rounded-xl border border-red-700/50 p-10">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Entity Not Found</h3>
                    <p className="text-slate-400">The profile for ID: **{entityId}** could not be retrieved.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* ... (Header remains the same) ... */}
            <div className="relative border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
                <div className="relative mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20"><Shield className="w-6 h-6 text-cyan-400" /></div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Security Monitoring System</h1>
                                <p className="text-sm text-slate-400 mt-1">Entity Profile & Activity Timeline</p>
                            </div>
                        </div>
                        <button onClick={() => window.history.back()} className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-all duration-200 text-sm font-medium">
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>


            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 1. Profile Details Section */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-slate-800/50 p-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-4 bg-slate-900 rounded-xl border border-cyan-500/20"><User className="w-8 h-8 text-cyan-400" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{profile?.name || entityId}</h2>
                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm border border-cyan-500/20">{profile?.role}</span>
                                            <span className="text-slate-400 text-sm">{profile?.department}</span>
                                        </div>
                                        <p className="text-slate-300 mt-2">{profile?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><Database className="w-3 h-3" /><span>Entity ID</span></div>
                                <p className="text-white font-mono text-sm">{profile?.entity_id || "—"}</p>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><User className="w-3 h-3" /><span>Student ID</span></div>
                                <p className="text-white font-mono text-sm">{profile?.student_id || "—"}</p>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><CreditCard className="w-3 h-3" /><span>Card ID</span></div>
                                <p className="text-white font-mono text-sm">{profile?.card_id || "—"}</p>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><Wifi className="w-3 h-3" /><span>Device Hash</span></div>
                                <p className="text-white font-mono text-sm truncate">{profile?.device_hash || "—"}</p>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><Camera className="w-3 h-3" /><span>Face ID</span></div>
                                <p className="text-white font-mono text-sm">{profile?.face_id || "—"}</p>
                            </div>
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2"><Clock className="w-3 h-3" /><span>Last Seen</span></div>
                                <p className="text-white text-sm">{profile?.last_seen ? new Date(profile.last_seen).toLocaleString() : "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Activity Summary & PIE CHART Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Summary Block (Col 1/2) */}
                        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Activity Summary (for {selectedDate ? formatDateForAPI(selectedDate) : 'selected date'})</h2>
                            {summary ? (
                                <div className="text-slate-300 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: summary.replace(/\*/g, '&bull;') }} />
                            ) : (
                                <p className="text-slate-500">No AI-generated summary available for the selected date.</p>
                            )}
                        </div>

                        {/* Pie Chart Block (Col 3) */}
                        <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <PieChartIcon className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-white">Activity Source Distribution</h3>
                            </div>
                            {totalEvents > 0 ? (
                                <div className="h-64 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={activityData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={90}
                                                labelLine={false}
                                                label={({ name }) => name}
                                            >
                                                {activityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip totalEvents={totalEvents} />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">No events found to chart.</p>
                                </div>
                            )}
                            <div className="mt-4 space-y-1">
                                {activityData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span>{item.name}</span>
                                        </div>
                                        <span>{item.value} events</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                    <div className="gap-6 py-8">
                        {/* 3. Calendar Column */}
                        <div className="flex  justify-center mb-6">
                            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CalendarIcon className="w-5 h-5 text-cyan-400" />
                                    <h3 className="text-lg font-bold text-white">Select Date</h3>
                                </div>
                                <Calendar value={selectedDate} onChange={onDateChange} maxDate={new Date()} className="rounded-lg bg-slate-900 text-white" />
                            </div>
                        </div>

                        {/* 4. Timeline & Prediction Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Event Timeline */}
                            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/50">
                                <div className="p-6 border-b border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-cyan-400" />
                                        <h2 className="text-xl font-bold text-white">Event Timeline</h2>
                                        <span className="ml-auto text-sm text-slate-400">{timeline.length} event{timeline.length !== 1 ? "s" : ""}</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    {timeline.length === 0 ? (
                                        <div className="text-center py-12">
                                            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Events Found</h3>
                                            <p className="text-slate-400">No events recorded for this date.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {Object.keys(groupedEvents).sort().map((hourKey) => (
                                                <div key={hourKey} className="relative">
                                                    <div className="sticky top-0 z-10 flex items-center gap-3 mb-4 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-800/50">
                                                        <Clock className="w-4 h-4 text-cyan-400" />
                                                        <span className="text-sm font-semibold text-cyan-400">{hourKey}</span>
                                                        <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                                                        <span className="text-xs text-slate-500">{groupedEvents[hourKey].length} events</span>
                                                    </div>
                                                    <div className="space-y-3 ml-4">
                                                        {groupedEvents[hourKey].map((ev, idx) => (
                                                            // *** MODULARIZED COMPONENT USAGE ***
                                                            <TimelineItem 
                                                                key={ev.event_id} 
                                                                event={ev} 
                                                                isLastInHour={idx === groupedEvents[hourKey].length - 1} 
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Predicted Location (XAI Improvement) */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl border border-cyan-500/20 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <MapPin className="w-5 h-5 text-cyan-400" /><h3 className="text-lg font-bold text-white">Predicted Location</h3>
                                </div>
                                {predict ? (
                                    <>
                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50 mb-4">
                                            <div className="text-2xl font-bold text-cyan-400 mb-1">{predict.predictedLocation}</div>
                                            <div className="text-xs text-slate-500">Next probable location (based on ML model)</div>
                                        </div>

                                        {/* XAI Explanation Section (Clickable) */}
                                        <button 
                                            onClick={() => setShowPredictionDetails(!showPredictionDetails)}
                                            className="w-full text-left flex items-center justify-between text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 border-b border-slate-700/50"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-cyan-400" />
                                                <span>AI Prediction Rationale (XAI)</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showPredictionDetails ? 'rotate-180' : 'rotate-0'}`} />
                                        </button>

                                        <div className={`overflow-hidden transition-all duration-500 ${showPredictionDetails ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                            <div className="space-y-4">
                                                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                                                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Prediction Explanation:</h4>
                                                    <p className="text-sm text-slate-300 leading-relaxed italic">{predict.explanation}</p>
                                                </div>

                                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
                                                    <div className="flex items-center gap-2 text-slate-400 text-xs p-3 border-b border-slate-800"><Activity className="w-3 h-3" /><span>Past Activity Pattern (Used for Prediction)</span></div>
                                                    {predict.pastActivities.length > 0 ? (
                                                        <ul className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                                                            {predict.pastActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((activity, idx) => (
                                                                <li key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition">
                                                                    <div className="flex items-center gap-2 text-slate-300">
                                                                        <MapPin className="w-4 h-4 text-cyan-400" /><span className="font-medium">{activity.location}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleString()}</div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <div className="text-center text-slate-500 text-sm py-4">No past activities available.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-16">
                                        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-400 text-sm">No prediction data available</p>
                                        <p className="text-xs text-slate-500 mt-1">Check entity activity or backend service status.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}