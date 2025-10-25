// frontend/src/app/pages/EntitySearch/[id]/TimelineItem.tsx
"use client"
import React from "react";
import {
    Activity,
    BookOpen,
    Camera,
    Clock,
    CreditCard,
    FileText,
    FlaskConical,
    MapPin,
    TrendingUp,
    Wifi,
} from "lucide-react";

type Profile = {
    entity_id: string;
    name: string;
    role: string;
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

type ItemProps = {
    event: TimelineEvent;
    isLastInHour: boolean;
};

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

const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function TimelineItem({ event, isLastInHour }: ItemProps) {
    const colors = getEventColor(event.event_type);

    return (
        <div className="relative pl-8 pb-3">
            {!isLastInHour && <div className="absolute left-3 top-10 bottom-0 w-px bg-gradient-to-b from-slate-700 to-transparent"></div>}
            <div className={`absolute left-0 top-2 w-6 h-6 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center ${colors.glow} shadow-lg`}>
                <div className={`w-2 h-2 rounded-full ${colors.text.replace("text-", "bg-")}`}></div>
            </div>
            <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-200 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>{getEventIcon(event.event_type)}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white font-medium">{formatEventType(event.event_type)}</h3>
                                <span className="text-xs text-slate-500">•</span>
                                <span className={`text-xs ${colors.text}`}>{formatTime(event.timestamp).time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                <MapPin className="w-3 h-3" />
                                <span>{event.location || "Unknown Location"}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>{formatTime(event.timestamp).date}</span>
                                <span>•</span>
                                <span>ID: {event.event_id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>Confidence</span>
                        </div>
                        <div className={`text-lg font-bold ${colors.text}`}>{Math.round(event.confidence * 100)}%</div>
                    </div>
                </div>

                {/* --- Nested Event Details --- */}
                <div className="mt-4 border-t border-slate-700/50 pt-4 space-y-3">
                    {event.event_type === "wifi_logs" && event.wifi_logs.length > 0 && (
                        <div className="bg-blue-500/10 rounded-lg border border-blue-500/20 p-3">
                            <div className="flex items-center gap-2 mb-2"><Wifi className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-blue-400">WiFi Logs</span></div>
                            <div className="space-y-1">{event.wifi_logs.map((log) => (<div key={log.id} className="text-xs text-slate-300"><span className="font-mono">AP: {log.ap_id}</span> • <span>Device: {log.device_hash.slice(0, 8)}...</span> • <span>{new Date(log.timestamp).toLocaleTimeString()}</span></div>))}</div>
                        </div>
                    )}
                    {event.event_type === "card_swipes" && event.card_swipes.length > 0 && (
                        <div className="bg-green-500/10 rounded-lg border border-green-500/20 p-3">
                            <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-green-400" /><span className="text-sm font-medium text-green-400">Card Swipes</span></div>
                            <div className="space-y-1">{event.card_swipes.map((swipe) => (<div key={swipe.id} className="text-xs text-slate-300"><span className="font-mono">Card: {swipe.card_id}</span> • <span>Location: {swipe.location_id}</span> • <span>{new Date(swipe.timestamp).toLocaleTimeString()}</span></div>))}</div>
                        </div>
                    )}
                    {event.event_type === "cctv_frames" && event.cctv_frames.length > 0 && (
                        <div className="bg-purple-500/10 rounded-lg border border-purple-500/20 p-3">
                            <div className="flex items-center gap-2 mb-2"><Camera className="w-4 h-4 text-purple-400" /><span className="text-sm font-medium text-purple-400">CCTV Frames</span></div>
                            <div className="space-y-1">{event.cctv_frames.map((frame) => (<div key={frame.frame_id} className="text-xs text-slate-300"><span className="font-mono">Frame: {frame.frame_id}</span> • <span>Location: {frame.location_id}</span> • <span>Face: {frame.face_id}</span> • <span>{new Date(frame.timestamp).toLocaleTimeString()}</span></div>))}</div>
                        </div>
                    )}
                    {event.event_type === "notes" && event.notes.length > 0 && (
                        <div className="bg-yellow-500/10 rounded-lg border border-yellow-500/20 p-3">
                            <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-yellow-400" /><span className="text-sm font-medium text-yellow-400">Notes</span></div>
                            <div className="space-y-1">{event.notes.map((note) => (<div key={note.id} className="text-xs text-slate-300"><span className="font-medium">{note.category}:</span> {note.text} • <span>{new Date(note.timestamp).toLocaleTimeString()}</span></div>))}</div>
                        </div>
                    )}
                    {event.event_type === "lab_bookings" && event.lab_bookings.length > 0 && (
                        <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-3">
                            <div className="flex items-center gap-2 mb-2"><FlaskConical className="w-4 h-4 text-orange-400" /><span className="text-sm font-medium text-orange-400">Lab Bookings</span></div>
                            <div className="space-y-1">{event.lab_bookings.map((booking) => (<div key={booking.id} className="text-xs text-slate-300"><span className="font-mono">Room: {booking.room_id}</span> • <span>{booking.start_time} - {booking.end_time}</span> • <span>Attended: {booking.attended ? "Yes" : "No"}</span></div>))}</div>
                        </div>
                    )}
                    {event.event_type === "library_checkout" && event.library_checkout.length > 0 && (
                        <div className="bg-teal-500/10 rounded-lg border border-teal-500/20 p-3">
                            <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-teal-400" /><span className="text-sm font-medium text-teal-400">Library Checkouts</span></div>
                            <div className="space-y-1">{event.library_checkout.map((checkout) => (<div key={checkout.id} className="text-xs text-slate-300"><span className="font-mono">Book: {checkout.book_id}</span> • <span>{new Date(checkout.timestamp).toLocaleTimeString()}</span></div>))}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}