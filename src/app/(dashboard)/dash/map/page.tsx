"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, ExternalLink, Navigation } from "lucide-react";

interface VisitEvent {
  id: string;
  jobId: string;
  address?: string;
  scheduledDate: string;
  checkInAt: string | null;
  notes: string | null;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function MapPage() {
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const today = isoDate(new Date());

  useEffect(() => {
    const tomorrow = isoDate(new Date(Date.now() + 86400000));
    fetch(`/api/schedule?start=${today}&end=${tomorrow}`)
      .then((r) => r.json())
      .then((d) => setVisits(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [today]);

  function googleMapsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  function directionsUrl(address: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Map View</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">
          Today&apos;s stops — {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Map placeholder */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden mb-5">
        <div className="h-48 sm:h-64 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]">
          <MapPin className="w-10 h-10 text-[#2d3748]" />
          <div className="text-center">
            <p className="text-sm text-[#4b5563] font-medium">Interactive map</p>
            <p className="text-xs text-[#374151] mt-0.5">
              Requires a Google Maps API key — configure in settings
            </p>
          </div>
        </div>
      </div>

      {/* Stop list */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">
          Today&apos;s Route ({visits.length} stop{visits.length !== 1 ? "s" : ""})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="w-8 h-8 text-[#4b5563] mb-3" />
            <p className="text-sm text-[#6b7280]">No visits scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit, idx) => {
              const address = visit.address ?? "Address not set";
              const hasAddress = Boolean(visit.address);

              return (
                <div
                  key={visit.id}
                  className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-4 flex items-start gap-4"
                >
                  {/* Stop number */}
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{address}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      Job ID: {visit.jobId.slice(0, 8)}…
                      {visit.checkInAt && (
                        <span className="ml-2 text-green-400">
                          Checked in {new Date(visit.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </p>
                    {visit.notes && (
                      <p className="text-xs text-[#4b5563] mt-1 truncate">{visit.notes}</p>
                    )}
                  </div>

                  {hasAddress && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={googleMapsUrl(address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#9ca3af] hover:text-white text-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Map
                      </a>
                      <a
                        href={directionsUrl(address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Go
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
