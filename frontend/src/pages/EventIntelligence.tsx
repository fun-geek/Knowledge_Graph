import React, { useEffect, useState } from "react";
import { EventItem } from "../types";
import { api } from "../services/api";
import {
  Calendar,
  Users,
  Search,
  ExternalLink,
  ArrowUpRight,
  Filter,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";

interface EventIntelligenceProps {
  onFocusEventInGraph: (eventId: string) => void;
  onAskAboutEvent: (eventName: string) => void;
}

export const EventIntelligence: React.FC<EventIntelligenceProps> = ({
  onFocusEventInGraph,
  onAskAboutEvent,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEvents()
      .then((data) => {
        setEvents(data);
        setFilteredEvents(data);
      })
      .catch((err) => console.error("Error fetching events:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = events;
    if (selectedDomain !== "ALL") {
      list = list.filter((e) => e.domain === selectedDomain);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.lead_name.toLowerCase().includes(q)
      );
    }
    setFilteredEvents(list);
  }, [selectedDomain, search, events]);

  const uniqueDomains = Array.from(new Set(events.map((e) => e.domain)));

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14131D] p-6 rounded-xl border border-borderDark">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-aiBlue/15 text-aiBlue text-[11px] font-mono font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>OPERATIONAL EVENT AUDIT</span>
          </div>
          <h1 className="text-2xl font-black text-textMain tracking-tight">Event Intelligence</h1>
          <p className="text-xs text-textMuted mt-1 max-w-xl">
            Inspect all 35 scheduled technical events, domain affiliations, verified attendance numbers, and lead organizers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-textMain">{filteredEvents.length}</span>
            <span className="text-xs font-mono text-textMuted block">Showing Events</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-[#14131D] p-3 rounded-xl border border-borderDark">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <input
            type="text"
            placeholder="Search events by ID, name, or lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0B0B12] text-xs text-textMain pl-9 pr-3 py-2 rounded-lg border border-borderDark focus:outline-none focus:border-primaryPurple font-mono"
          />
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedDomain("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
              selectedDomain === "ALL"
                ? "bg-primaryPurple text-white font-bold"
                : "bg-[#0B0B12] text-textMuted hover:text-textMain border border-borderDark"
            }`}
          >
            All Domains
          </button>
          {uniqueDomains.map((dom) => (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                selectedDomain === dom
                  ? "bg-aiBlue text-white font-bold"
                  : "bg-[#0B0B12] text-textMuted hover:text-textMain border border-borderDark"
              }`}
            >
              {dom}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-16 text-textMuted font-mono text-xs">
          Loading Campus Events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 text-textMuted font-mono text-xs">
          No events found matching your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-[#14131D] p-5 rounded-xl border border-borderDark flex flex-col justify-between hover:border-primaryPurple/50 transition-all shadow-md group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-aiBlue/20 text-aiBlue border border-aiBlue/30">
                    {evt.id}
                  </span>
                  <span className="text-xs font-mono text-textMuted bg-[#0B0B12] px-2 py-0.5 rounded border border-borderDark">
                    {evt.domain}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-textMain group-hover:text-white leading-snug">
                  {evt.name}
                </h3>

                <div className="space-y-1.5 mt-4 text-xs">
                  <div className="flex items-center justify-between text-textMuted">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Date:</span>
                    </span>
                    <span className="font-mono text-textMain">{evt.date}</span>
                  </div>

                  <div className="flex items-center justify-between text-textMuted">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Expected Attendees:</span>
                    </span>
                    <span
                      className={`font-mono font-semibold ${
                        evt.attendee_count >= 100 ? "text-policyRed" : "text-emerald-400"
                      }`}
                    >
                      {evt.attendee_count} {evt.attendee_count >= 100 && "(POL004 Req.)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-textMuted">
                    <span>Organizer Lead:</span>
                    <span className="font-semibold text-textMain">{evt.lead_name}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-borderDark flex items-center justify-between gap-2">
                <button
                  onClick={() => onFocusEventInGraph(evt.id)}
                  className="flex-1 px-3 py-1.5 bg-[#0B0B12] hover:bg-[#1C1A28] rounded-lg border border-borderDark text-xs font-medium text-textMain flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-primaryPurple" />
                  <span>Focus in Graph</span>
                </button>
                <button
                  onClick={() => onAskAboutEvent(evt.name)}
                  className="px-3 py-1.5 bg-aiBlue/15 hover:bg-aiBlue/25 rounded-lg border border-aiBlue/30 text-xs font-medium text-aiBlue flex items-center justify-center gap-1 transition-colors"
                  title="Ask Graph about this event"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
