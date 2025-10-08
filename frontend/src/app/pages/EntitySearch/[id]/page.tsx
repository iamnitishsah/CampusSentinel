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
} from "lucide-react";

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

const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
                const pRes = await fetch(`http://127.0.0.1:8000/api/entities/${entityId}/`);
                if (pRes.ok) {
                    setProfile(await pRes.json());
                }

                const formattedDate = formatDateForAPI(selectedDate);
                const tRes = await fetch(`http://127.0.0.1:8000/api/entities/${entityId}/timeline/?date=${formattedDate}`);
                if (tRes.ok) {
                    const data = await tRes.json();
                    setTimeline(data.timeline || []);
                    setSummary(data.summary || "");
                } else {
                    setTimeline([]);
                    setSummary("");
                }

                const predictRes = await fetch("http://127.0.0.1:8000/api/predict/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
                }
            } catch (err) {
                console.error("Error fetching entity data:", err);
                setTimeline([]);
                setSummary("");
                setPredict(null);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [entityId, selectedDate]);

    const getEventIcon = (type: string) => {
        switch (type) {
            case "wifi_logs": return <Wifi className="w-5 h-5" />;
            case "card_swipes": return <CreditCard className="w-5 h-5" />;
            case "cctv_frames": return <Camera className="w-5 h-5" />;
            case "notes": return <FileText className="w-5 h-5" />;
            case "lab_bookings": return <FlaskConical className="w-5 h-5" />;
            case "library_checkout": return <BookOpen className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case "wifi_logs": return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", glow: "shadow-blue-500/20" };
            case "card_swipes": return { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", glow: "shadow-green-500/20" };
            case "cctv_frames": return { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", glow: "shadow-purple-500/20" };
            case "notes": return { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", glow: "shadow-yellow-500/20" };
            case "lab_bookings": return { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", glow: "shadow-orange-500/20" };
            case "library_checkout": return { bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400", glow: "shadow-teal-500/20" };
            default: return { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400", glow: "shadow-slate-500/20" };
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return {
            time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };
    };

    const groupEventsByHour = (events: TimelineEvent[]) => {
        const grouped: { [key: string]: TimelineEvent[] } = {};
        events.forEach((event) => {
            const hour = new Date(event.timestamp).getHours();
            const hourKey = `${hour.toString().padStart(2, "0")}:00`;
            if (!grouped[hourKey]) grouped[hourKey] = [];
            grouped[hourKey].push(event);
        });
        return grouped;
    };

    const groupedEvents = groupEventsByHour(timeline);

    const formatEventType = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
                            <p className="text-slate-400">Loading security data...</p>
                        </div>
                    </div>
                ) : (
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

                        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6 mb-6">
                            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Activity Summary</h2>
                            {summary ? (
                                <div className="text-slate-300 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: summary.replace(/\*/g, '&bull;') }} />
                            ) : (
                                <p className="text-slate-500">No summary available for the selected date.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <CalendarIcon className="w-5 h-5 text-cyan-400" />
                                        <h3 className="text-lg font-bold text-white">Select Date</h3>
                                    </div>
                                    <Calendar value={selectedDate} onChange={onDateChange} maxDate={new Date()} className="rounded-lg bg-slate-900 text-white" />
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-6">
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
                                                            {groupedEvents[hourKey].map((ev, idx) => {
                                                                const colors = getEventColor(ev.event_type);
                                                                return (
                                                                    <div key={ev.event_id} className="relative pl-8 pb-3">
                                                                        {idx !== groupedEvents[hourKey].length - 1 && <div className="absolute left-3 top-10 bottom-0 w-px bg-gradient-to-b from-slate-700 to-transparent"></div>}
                                                                        <div className={`absolute left-0 top-2 w-6 h-6 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center ${colors.glow} shadow-lg`}>
                                                                            <div className={`w-2 h-2 rounded-full ${colors.text.replace("text-", "bg-")}`}></div>
                                                                        </div>
                                                                        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-200 p-4">
                                                                            <div className="flex items-start justify-between gap-4">
                                                                                <div className="flex items-start gap-3 flex-1">
                                                                                    <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>{getEventIcon(ev.event_type)}</div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <h3 className="text-white font-medium">{formatEventType(ev.event_type)}</h3>
                                                                                            <span className="text-xs text-slate-500">•</span>
                                                                                            <span className={`text-xs ${colors.text}`}>{formatTime(ev.timestamp).time}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><MapPin className="w-3 h-3" /><span>{ev.location || "Unknown Location"}</span></div>
                                                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                                            <span>{formatTime(ev.timestamp).date}</span><span>•</span><span>ID: {ev.event_id.slice(0, 8)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1"><TrendingUp className="w-3 h-3" /><span>Confidence</span></div>
                                                                                    <div className={`text-lg font-bold ${colors.text}`}>{Math.round(ev.confidence * 100)}%</div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-4 border-t border-slate-700/50 pt-4">
                                                                                {ev.event_type === "wifi_logs" && ev.wifi_logs.length > 0 && (
                                                                                    <div className="bg-blue-500/10 rounded-lg border border-blue-500/20 p-3">
                                                                                        <div className="flex items-center gap-2 mb-2"><Wifi className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-blue-400">WiFi Logs</span></div>
                                                                                        <div className="space-y-1">{ev.wifi_logs.map((log) => (<div key={log.id} className="text-xs text-slate-300"><span className="font-mono">AP: {log.ap_id}</span> • <span>Device: {log.device_hash.slice(0, 8)}...</span> • <span>{new Date(log.timestamp).toLocaleTimeString()}</span></div>))}</div>
                                                                                    </div>
                                                                                )}
                                                                                {ev.event_type === "card_swipes" && ev.card_swipes.length > 0 && (
                                                                                    <div className="bg-green-500/10 rounded-lg border border-green-500/20 p-3">
                                                                                        <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-green-400" /><span className="text-sm font-medium text-green-400">Card Swipes</span></div>
                                                                                        <div className="space-y-1">{ev.card_swipes.map((swipe) => (<div key={swipe.id} className="text-xs text-slate-300"><span className="font-mono">Card: {swipe.card_id}</span> • <span>Location: {swipe.location_id}</span> • <span>{new Date(swipe.timestamp).toLocaleTimeString()}</span></div>))}</div>
                                                                                    </div>
                                                                                )}
                                                                                {ev.event_type === "cctv_frames" && ev.cctv_frames.length > 0 && (
                                                                                    <div className="bg-purple-500/10 rounded-lg border border-purple-500/20 p-3">
                                                                                        <div className="flex items-center gap-2 mb-2"><Camera className="w-4 h-4 text-purple-400" /><span className="text-sm font-medium text-purple-400">CCTV Frames</span></div>
                                                                                        <div className="space-y-1">{ev.cctv_frames.map((frame) => (<div key={frame.frame_id} className="text-xs text-slate-300"><span className="font-mono">Frame: {frame.frame_id}</span> • <span>Location: {frame.location_id}</span> • <span>Face: {frame.face_id}</span> • <span>{new Date(frame.timestamp).toLocaleTimeString()}</span></div>))}</div>
                                                                                    </div>
                                                                                )}
                                                                                {ev.event_type === "notes" && ev.notes.length > 0 && (
                                                                                    <div className="bg-yellow-500/10 rounded-lg border border-yellow-500/20 p-3">
                                                                                        <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-yellow-400" /><span className="text-sm font-medium text-yellow-400">Notes</span></div>
                                                                                        <div className="space-y-1">{ev.notes.map((note) => (<div key={note.id} className="text-xs text-slate-300"><span className="font-medium">{note.category}:</span> {note.text} • <span>{new Date(note.timestamp).toLocaleTimeString()}</span></div>))}</div>
                                                                                    </div>
                                                                                )}
                                                                                {ev.event_type === "lab_bookings" && ev.lab_bookings.length > 0 && (
                                                                                    <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-3">
                                                                                        <div className="flex items-center gap-2 mb-2"><FlaskConical className="w-4 h-4 text-orange-400" /><span className="text-sm font-medium text-orange-400">Lab Bookings</span></div>
                                                                                        <div className="space-y-1">{ev.lab_bookings.map((booking) => (<div key={booking.id} className="text-xs text-slate-300"><span className="font-mono">Room: {booking.room_id}</span> • <span>{booking.start_time} - {booking.end_time}</span> • <span>Attended: {booking.attended ? "Yes" : "No"}</span></div>))}</div>
                                                                                    </div>
                                                                                )}
                                                                                {ev.event_type === "library_checkout" && ev.library_checkout.length > 0 && (
                                                                                    <div className="bg-teal-500/10 rounded-lg border border-teal-500/20 p-3">
                                                                                        <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-teal-400" /><span className="text-sm font-medium text-teal-400">Library Checkouts</span></div>
                                                                                        <div className="space-y-1">{ev.library_checkout.map((checkout) => (<div key={checkout.id} className="text-xs text-slate-300"><span className="font-mono">Book: {checkout.book_id}</span> • <span>{new Date(checkout.timestamp).toLocaleTimeString()}</span></div>))}</div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl border border-cyan-500/20 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <MapPin className="w-5 h-5 text-cyan-400" /><h3 className="text-lg font-bold text-white">Predicted Location</h3>
                                    </div>
                                    {predict ? (
                                        <>
                                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50 mb-4">
                                                <div className="text-2xl font-bold text-cyan-400 mb-1">{predict.predictedLocation}</div>
                                                <div className="text-xs text-slate-500">Next probable location</div>
                                            </div>
                                            <div className="space-y-2 mb-6">
                                                <div className="flex items-center gap-2 text-slate-400 text-xs"><Eye className="w-3 h-3" /><span>Why this prediction?</span></div>
                                                <p className="text-sm text-slate-300 leading-relaxed">{predict.explanation}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-slate-400 text-xs"><Activity className="w-3 h-3" /><span>Past Activity Pattern</span></div>
                                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden">
                                                    {predict.pastActivities.length > 0 ? (
                                                        <ul className="divide-y divide-slate-800">
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
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm">No prediction data available</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}