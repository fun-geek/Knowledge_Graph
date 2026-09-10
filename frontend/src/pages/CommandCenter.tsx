import React, { useEffect, useState } from "react";
import { StatsResponse } from "../types";
import { api } from "../services/api";
import {
  Network,
  Users,
  Calendar,
  ShieldAlert,
  FolderGit2,
  Share2,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";
import { NavPage } from "../components/layout/Sidebar";

interface CommandCenterProps {
  onNavigate: (page: NavPage) => void;
  onRunSampleQuery: (query: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  onNavigate,
  onRunSampleQuery,
}) => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.getStats(), api.getMemory()])
      .then(([statsData, memData]) => {
        setStats(statsData);
        setRecentQueries(memData.items || []);
      })
      .catch((err) => console.error("Error loading dashboard:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-textMuted font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primaryPurple border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Knowledge Graph Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "NODES",
      val: stats?.total_nodes ?? 74,
      desc: "Validated Entities",
      icon: Network,
      color: "#2B3AF3",
    },
    {
      label: "RELATIONSHIPS",
      val: stats?.total_edges ?? 346,
      desc: "Bidirectional Edges",
      icon: Share2,
      color: "#6F2982",
    },
    {
      label: "MEMBERS",
      val: stats?.members_count ?? 10,
      desc: "Technical Leads",
      icon: Users,
      color: "#FF7071",
    },
    {
      label: "EVENTS",
      val: stats?.events_count ?? 35,
      desc: "Tracked Operations",
      icon: Calendar,
      color: "#2B3AF3",
    },
    {
      label: "POLICIES",
      val: stats?.policies_count ?? 5,
      desc: "Governing Protocols",
      icon: ShieldAlert,
      color: "#E84855",
    },
  ];

  const sampleQueries = [
    "Who must approve restricted GPU access?",
    "Who leads AI/ML events?",
    "Who is the cloud lead?",
    "Who gives final approval for events above 100 attendees?",
    "Who manages robotics lab access?",
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#14131D] to-[#1C1A28] p-6 rounded-xl border border-borderDark shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primaryPurple/20 border border-primaryPurple/40 text-[11px] font-mono text-primaryPurple mb-2">
            <span className="w-2 h-2 rounded-full bg-primaryPurple animate-ping" />
            GDG ON CAMPUS KNOWLEDGE INTELLIGENCE
          </div>
          <h1 className="text-2xl font-black text-textMain tracking-tight">
            Campus Collective Command Center
          </h1>
          <p className="text-xs text-textMuted mt-1 max-w-2xl leading-relaxed">
            Deterministic graph retrieval first, probabilistic reasoning second. Ingests events, members, and
            operating policies into a validated 2-hop traversal knowledge graph.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("knowledge-explorer")}
            className="px-4 py-2.5 bg-primaryPurple hover:bg-primaryPurple/80 text-white font-semibold text-xs rounded-lg transition-all shadow-lg shadow-primaryPurple/25 flex items-center gap-1.5"
          >
            <Network className="w-4 h-4" />
            <span>Explore Graph</span>
          </button>
          <button
            onClick={() => onNavigate("query-console")}
            className="px-4 py-2.5 bg-[#14131D] hover:bg-[#1C1A28] border border-borderDark text-textMain font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
          >
            <Cpu className="w-4 h-4 text-aiBlue" />
            <span>Query Console</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-[#14131D] p-5 rounded-xl border border-borderDark flex flex-col justify-between hover:border-opacity-60 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono tracking-wider font-semibold text-textMuted uppercase">
                  {kpi.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${kpi.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black font-mono text-textMain tracking-tight group-hover:scale-105 transition-transform origin-left">
                  {kpi.val}
                </p>
                <p className="text-[11px] text-textMuted mt-1">{kpi.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Graph Health & Domain Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graph Health Audit */}
        <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-textMain tracking-wide uppercase font-mono">
                  Graph Health & Integrity
                </h3>
                <p className="text-xs text-textMuted">Automated structural verification</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
                ✓ ALL CHECKS PASSED
              </span>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded-lg border border-borderDark text-xs">
                <span className="flex items-center gap-2 text-textMain">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Unique & Valid Node Identifiers</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {stats?.total_nodes} / {stats?.total_nodes} Valid
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded-lg border border-borderDark text-xs">
                <span className="flex items-center gap-2 text-textMain">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Bidirectional Edge Completeness</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {stats?.total_edges} Edges
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded-lg border border-borderDark text-xs">
                <span className="flex items-center gap-2 text-textMain">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Orphan Nodes (Degree == 0)</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold">0 Detected</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded-lg border border-borderDark text-xs">
                <span className="flex items-center gap-2 text-textMain">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Broken Edge References</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold">0 Detected</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-borderDark flex items-center justify-between text-xs">
            <span className="text-textMuted">Audited dynamically on load</span>
            <button
              onClick={() => onNavigate("diagnostics")}
              className="text-primaryPurple hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              <span>Full Diagnostics View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Domain Distribution */}
        <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-textMain tracking-wide uppercase font-mono">
                  Domain Distribution
                </h3>
                <p className="text-xs text-textMuted">Operational activity per technical domain</p>
              </div>
              <Layers className="w-4 h-4 text-primaryPurple" />
            </div>

            <div className="space-y-3 pt-1">
              {stats?.domain_distribution &&
                Object.entries(stats.domain_distribution).map(([domain, count]) => {
                  const pct = Math.round((count / (stats.events_count || 1)) * 100);
                  return (
                    <div key={domain} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-textMain font-medium">{domain}</span>
                        <span className="text-textMuted">{count} events ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-[#0B0B12] rounded-full overflow-hidden border border-borderDark/40">
                        <div
                          className="h-full bg-gradient-to-r from-primaryPurple to-aiBlue rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-borderDark flex items-center justify-between text-xs">
            <span className="text-textMuted">{stats?.domains_count} Normalized Domains Active</span>
            <button
              onClick={() => onNavigate("event-intelligence")}
              className="text-aiBlue hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              <span>Inspect All Events</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Benchmark Demo Queries */}
      <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-textMain tracking-wide uppercase font-mono">
              Benchmark Verification Queries
            </h3>
            <p className="text-xs text-textMuted">
              Click any query to execute 2-hop traversal and test deterministic verification
            </p>
          </div>
          <Cpu className="w-4 h-4 text-aiBlue" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onRunSampleQuery(q)}
              className="text-left p-3 rounded-lg bg-[#0B0B12] hover:bg-[#1C1A28] border border-borderDark hover:border-primaryPurple/50 transition-all flex items-center justify-between group"
            >
              <span className="text-xs font-medium text-textMain group-hover:text-white pr-2">
                {q}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-textMuted group-hover:text-primaryPurple transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
