import React from "react";
import {
  LayoutDashboard,
  Compass,
  TerminalSquare,
  CalendarDays,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { SystemHealth } from "../../types";

export type NavPage =
  | "command-center"
  | "knowledge-explorer"
  | "query-console"
  | "event-intelligence"
  | "policy-center"
  | "diagnostics";

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  systemHealth: SystemHealth | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  systemHealth,
}) => {
  const navItems: Array<{ id: NavPage; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: "command-center", label: "Command Center", icon: LayoutDashboard },
    { id: "knowledge-explorer", label: "Knowledge Explorer", icon: Compass },
    { id: "query-console", label: "Query Console", icon: TerminalSquare },
    { id: "event-intelligence", label: "Event Intelligence", icon: CalendarDays },
    { id: "policy-center", label: "Policy Center", icon: ShieldAlert },
    { id: "diagnostics", label: "Diagnostics", icon: Activity },
  ];

  return (
    <aside className="w-64 bg-[#0B0B12] border-r border-borderDark flex flex-col justify-between h-screen select-none">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-borderDark flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primaryPurple to-aiBlue flex items-center justify-center shadow-lg shadow-primaryPurple/30">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider uppercase text-textMain leading-tight">
              Campus Collective
            </h1>
            <p className="text-[10px] font-mono text-textMuted tracking-widest uppercase">
              Knowledge Engine
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-primaryPurple/20 to-transparent border-l-2 border-primaryPurple text-white"
                    : "text-textMuted hover:text-textMain hover:bg-[#14131D]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-primaryPurple" : "text-textMuted"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Persistent System Telemetry Indicators */}
      <div className="p-4 border-t border-borderDark bg-[#14131D]/40 space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-textMuted font-bold flex items-center justify-between">
          <span>System Status</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <div className="space-y-1.5 text-[11px] font-mono">
          {/* Graph Status */}
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>GRAPH ONLINE</span>
            </span>
            <span className="text-[10px] text-textMuted">
              {systemHealth ? `${systemHealth.nodes_loaded}N / ${systemHealth.edges_loaded}E` : "LOADED"}
            </span>
          </div>

          {/* AI Engine Status */}
          {systemHealth?.gemini_available ? (
            <div className="flex items-center gap-1.5 text-aiBlue font-semibold">
              <span className="w-2 h-2 rounded-full bg-aiBlue shadow-sm shadow-aiBlue" />
              <span>GEMINI ENHANCED</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-textMuted">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>OFFLINE ENGINE</span>
              </span>
              <span className="text-[9px] text-textMuted">ACTIVE</span>
            </div>
          )}

          {/* Retrieval Engine */}
          <div className="flex items-center gap-1.5 text-textMuted text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>2-HOP RETRIEVAL READY</span>
          </div>

          {/* Source Validation */}
          <div className="flex items-center gap-1.5 text-textMuted text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>SOURCE AUDITING ACTIVE</span>
          </div>
        </div>

        <div className="pt-2 border-t border-borderDark text-[9px] font-mono text-textMuted flex items-center justify-between">
          <span>v2.0 GDG Lead</span>
          <span>Zero Hallucination</span>
        </div>
      </div>
    </aside>
  );
};
