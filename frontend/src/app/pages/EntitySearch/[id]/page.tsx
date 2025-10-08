"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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

export default function EntityPage() {
  const params = useParams() as { id?: string };
  const entityId = params?.id || "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState<string>(
    weekAgo.toISOString().slice(0, 10)
  );
  const [types, setTypes] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(weekAgo);
  const [summary, setSummary] = useState<string>("");
  const [predict, setPredict] = useState<{
    predictedLocation: string;
    confidence: number;
    evidence: string[];
  } | null>(null);

  const onDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      setStartDate(value.toISOString().slice(0, 10));
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (!entityId) return;
      setLoading(true);
      try {
        const pRes = await fetch(
          `http://localhost:8000/api/entities/${entityId}/`
        );
        if (pRes.ok) {
          const pjson = await pRes.json();
        // Timeline
        let url = `http://localhost:8000/api/entities/${entityId}/timeline/`;
        const params = new URLSearchParams();
        if (startDate) params.append("date", startDate);

        if (types) params.append("types", types);
        if (params.toString()) url += `?${params.toString()}`;

        const tRes = await fetch(url);
        if (tRes.ok) {
          const data = await tRes.json();
          setTimeline(data.timeline || []);
          setSummary(data.summary || "");
        } else {
          setTimeline([]);
          setSummary("");
        }

        // Predictive Monitoring (demo)
        // Replace this with your actual ML API endpoint
        const predictRes = await fetch(
          `http://localhost:8000/api/entities/${entityId}/predict/`
        );
        if (predictRes.ok) {
          const predictJson = await predictRes.json();
          setPredict({
            predictedLocation: predictJson.predictedLocation || "Unknown",
            confidence: predictJson.confidence || 0,
            evidence: predictJson.evidence || [],
          });
        } else {
          setPredict(null);
        }
      }
      } catch (err) {
        console.error("Error fetching entity data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [entityId, startDate, types]);

  const iconFor = (t: TimelineEvent["event_type"]) =>
    t === "wifi" ? "📶" : t === "card" ? "💳" : t === "cctv" ? "📹" : "•";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/pages/dashboard"
            className="text-slate-300 hover:underline"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Entity Profile & Timeline</h1>
          <div />
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="bg-slate-900 rounded-xl p-6 mb-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {profile?.name || entityId}
                </h2>
                <p className="text-sm text-slate-400">
                  {profile?.role} • {profile?.department}
                </p>
                <p className="text-sm mt-2">{profile?.email}</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-slate-300 text-sm">Identifiers</div>
                <div className="text-sm">
                  <strong>Entity ID:</strong> {profile?.entity_id}
                </div>
                <div className="text-sm">
                  <strong>Student ID:</strong> {profile?.student_id || "—"}
                </div>
                <div className="text-sm">
                  <strong>Card ID:</strong> {profile?.card_id || "—"}
                </div>
                <div className="text-sm">
                  <strong>Device Hash:</strong> {profile?.device_hash || "—"}
                </div>
                <div className="text-sm">
                  <strong>Face ID:</strong> {profile?.face_id || "—"}
                </div>
              </div>

            </div>

            <div className="mb-6 flex flex-col items-start">
              <label className="mb-2 font-semibold text-slate-300">
                Select Date :
              </label>
              <Calendar
                value={selectedDate}
                onChange={onDateChange}
                selectRange={false}
                maxDate={new Date()}
                className="rounded-lg bg-slate-900 text-white"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Timeline + AI Summary */}
              <div className="lg:col-span-2 space-y-4">
                {/* AI-Powered Daily Summary */}
                <div className="bg-slate-900 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Daily Summary</h3>
                      <p className="text-sm text-slate-400">
                        AI-generated concise summary
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      Confidence: demo
                    </div>
                  </div>
                  <div className="mt-3 text-slate-200">{summary || "—"}</div>
                </div>

                {/* Interactive Timeline */}
                <div className="bg-slate-900 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Timeline</h3>
                  <table className="w-full text-sm text-slate-200">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Location</th>
                        <th className="text-left p-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="text-center text-slate-400 p-6"
                          >
                            No events for selected period.
                          </td>
                        </tr>
                      ) : (
                        timeline.map((ev, idx) => (
                          <tr key={idx} className="hover:bg-slate-800">
                            <td className="p-2">
                              {iconFor(ev.event_type)} {ev.event_type}
                            </td>
                            <td className="p-2">{ev.location || "—"}</td>
                            <td className="p-2">
                              {new Date(ev.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Predictive Monitoring & Explainability */}
              <aside className="space-y-4">
                <div className="bg-slate-900 rounded-xl p-4">
                  <h3 className="text-lg font-semibold">Predicted Location</h3>
                  {predict ? (
                    <>
                      <div className="mt-3 text-xl font-bold">
                        {predict.predictedLocation}{" "}
                        <span className="text-sm text-slate-400">({predict.confidence}% confidence)</span>
                      </div>
                      <div className="mt-3 text-sm text-slate-300">Evidence</div>
                      <ul className="list-disc ml-4 mt-2 text-sm text-slate-400">
                        {predict.evidence.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="text-slate-400 mt-3">No prediction available (demo).</div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-xl p-4">
                  <h4 className="font-semibold text-sm text-slate-300">Explainability</h4>
                  <div className="mt-2 text-xs text-slate-400">
                    The prediction is built from recent Wi-Fi associations, card swipes, and CCTV timestamps.
                    
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
