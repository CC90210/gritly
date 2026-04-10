"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrgStore } from "@/lib/store/org";
import { ChevronLeft, ChevronRight, Loader2, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface VisitEvent {
  id: string;
  jobId: string;
  technicianId: string;
  scheduledDate: string;
  checkInAt: string | null;
  notes: string | null;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isoDate(d: Date): string {
  // Use local date (not UTC) to avoid off-by-one errors when user is behind UTC
  return d.toLocaleDateString("en-CA"); // returns YYYY-MM-DD in local timezone
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

export default function SchedulePage() {
  const { industryConfig } = useOrgStore();
  const jobLabel = industryConfig?.terminology.jobPlural ?? "Jobs";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<VisitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(isoDate(today));

  useEffect(() => {
    loadSchedule();
  }, [year, month]);

  function loadSchedule() {
    const start = isoDate(startOfMonth(year, month));
    const end = isoDate(endOfMonth(year, month));
    setLoading(true);
    setError(false);
    fetch(`/api/schedule?start=${start}&end=${end}`)
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => { if (d) setEvents(Array.isArray(d) ? d : []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = startOfMonth(year, month);
  const lastDay = endOfMonth(year, month);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = events.reduce<Record<string, VisitEvent[]>>((acc, ev) => {
    const day = ev.scheduledDate;
    if (!acc[day]) acc[day] = [];
    acc[day].push(ev);
    return acc;
  }, {});

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Schedule</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{jobLabel} calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg bg-[#111111] border border-[#1f1f1f] text-[#9ca3af] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white w-36 text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg bg-[#111111] border border-[#1f1f1f] text-[#9ca3af] hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-[#9ca3af]">Failed to load schedule. Please try again.</p>
          <button onClick={loadSchedule} className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[#1f1f1f]">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center py-2.5 text-xs font-medium text-[#6b7280]">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  if (day === null) {
                    return <div key={idx} className="border-b border-r border-[#1f1f1f]/30 min-h-[60px]" />;
                  }
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEvents = eventsByDay[dateStr] ?? [];
                  const isToday = dateStr === isoDate(today);
                  const isSelected = dateStr === selectedDay;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(dateStr)}
                      className={cn(
                        "border-b border-r border-[#1f1f1f]/30 min-h-[60px] p-1.5 text-left transition-colors hover:bg-[#1a1a1a]",
                        isSelected && "bg-orange-500/10 border-orange-500/20"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mb-1",
                          isToday ? "bg-orange-500 text-white font-bold" : "text-[#9ca3af]",
                          isSelected && !isToday && "text-orange-400 font-semibold"
                        )}
                      >
                        {day}
                      </span>
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          title={ev.notes ?? "Job visit"}
                          className="w-full h-1.5 rounded-full bg-orange-500 mb-0.5"
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-[#6b7280]">+{dayEvents.length - 2} more</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Day detail panel */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              {selectedDay
                ? new Date(selectedDay + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                : "Select a day"}
            </h2>

            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="w-8 h-8 text-[#4b5563] mb-3" />
                <p className="text-sm text-[#6b7280]">No {jobLabel.toLowerCase()} scheduled</p>
                <Link
                  href="/dash/jobs/new"
                  className="text-orange-500 text-xs mt-2 hover:underline"
                >
                  Schedule a {industryConfig?.terminology.job.toLowerCase() ?? "job"}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/dash/jobs/${ev.jobId}`}
                    className="block bg-[#0a0a0a] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-3 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <p className="text-xs font-medium text-orange-400">Job Visit</p>
                    </div>
                    {ev.checkInAt && (
                      <p className="text-xs text-[#6b7280]">
                        Check-in: {new Date(ev.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {ev.notes && <p className="text-xs text-[#9ca3af] mt-1 truncate">{ev.notes}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
