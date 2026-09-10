import React, { useEffect, useState } from "react";
import { PolicyItem } from "../types";
import { api } from "../services/api";
import {
  ShieldAlert,
  FileText,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  GitFork,
  Layers,
} from "lucide-react";
import { NODE_COLORS } from "../utils/colors";

interface PolicyCenterProps {
  onFocusPolicyInGraph: (policyId: string) => void;
  onAskAboutPolicy: (policyTitle: string) => void;
}

export const PolicyCenter: React.FC<PolicyCenterProps> = ({
  onFocusPolicyInGraph,
  onAskAboutPolicy,
}) => {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyItem | null>(null);

  useEffect(() => {
    api
      .getPolicies()
      .then((data) => {
        setPolicies(data);
        if (data.length > 0) setSelectedPolicy(data[0]);
      })
      .catch((err) => console.error("Error fetching policies:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-policyRed/15 text-policyRed text-[11px] font-mono font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CAMPUS TECHNICAL COMMITTEE OPERATING POLICIES</span>
          </div>
          <h1 className="text-2xl font-black text-textMain tracking-tight">Policy Center</h1>
          <p className="text-xs text-textMuted mt-1 max-w-xl">
            Governing rules, budget limits, hardware access tiers, and approval workflows extracted from policies.txt.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black font-mono text-policyRed">5</span>
          <span className="text-xs font-mono text-textMuted block">Enforced Policies</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-textMuted font-mono text-xs">
          Loading Policy Knowledge Subgraph...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Policy Cards List (Left 5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {policies.map((pol) => {
              const isSelected = selectedPolicy?.id === pol.id;
              return (
                <div
                  key={pol.id}
                  onClick={() => setSelectedPolicy(pol)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1C1A28] border-policyRed shadow-lg shadow-policyRed/10"
                      : "bg-[#14131D] border-borderDark hover:border-opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-policyRed/20 text-policyRed border border-policyRed/30">
                      {pol.id}
                    </span>
                    <span className="text-xs font-mono text-textMuted">Section {pol.properties.section}</span>
                  </div>
                  <h3 className="text-sm font-bold text-textMain">{pol.name}</h3>
                  <p className="text-xs text-textMuted mt-1 line-clamp-2">
                    {pol.properties.summary}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-borderDark text-[11px] text-textMuted">
                    <span>{pol.connected_entities.length} Linked Graph Entities</span>
                    <span className="text-policyRed font-mono font-semibold">Inspect &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Policy Inspector (Right 7 Cols) */}
          {selectedPolicy && (
            <div className="lg:col-span-7 bg-[#14131D] p-6 rounded-xl border border-borderDark space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-borderDark pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase bg-policyRed/20 text-policyRed border border-policyRed/30">
                      {selectedPolicy.id}
                    </span>
                    <span className="text-xs font-mono text-textMuted">Provenance: {selectedPolicy.source}</span>
                  </div>
                  <h2 className="text-lg font-bold text-textMain mt-1">{selectedPolicy.name}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onFocusPolicyInGraph(selectedPolicy.id)}
                    className="px-3 py-1.5 bg-[#0B0B12] hover:bg-[#1C1A28] text-textMain text-xs font-medium rounded-lg border border-borderDark flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-policyRed" />
                    <span>Focus in Graph</span>
                  </button>
                  <button
                    onClick={() => onAskAboutPolicy(selectedPolicy.name)}
                    className="px-3 py-1.5 bg-aiBlue text-white text-xs font-medium rounded-lg shadow-md shadow-aiBlue/30 flex items-center gap-1.5 transition-opacity hover:opacity-90"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask Graph</span>
                  </button>
                </div>
              </div>

              {/* Policy Clause Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase text-textMuted font-semibold tracking-wider">
                  Operating Protocol Summary
                </h4>
                <div className="p-4 rounded-lg bg-[#0B0B12] border border-borderDark text-xs text-textMain leading-relaxed font-sans">
                  {selectedPolicy.properties.summary}
                </div>
              </div>

              {/* Specific Rules / Tiers / Thresholds */}
              {selectedPolicy.properties.tiers && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase text-textMuted font-semibold tracking-wider">
                    Hardware Access Tiers
                  </h4>
                  <div className="space-y-1.5">
                    {selectedPolicy.properties.tiers.map((t: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#0B0B12] rounded-lg border border-borderDark text-xs text-textMain flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primaryPurple mt-0.5 flex-shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Authorities & Entities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase text-textMuted font-semibold tracking-wider">
                    Connected Graph Relationships ({selectedPolicy.connected_entities.length})
                  </h4>
                  <GitFork className="w-3.5 h-3.5 text-textMuted" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedPolicy.connected_entities.map((conn, idx) => {
                    const color = NODE_COLORS[conn.neighbor_type as keyof typeof NODE_COLORS] || "#2B3AF3";
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#0B0B12] rounded-lg border border-borderDark flex flex-col gap-1 hover:border-opacity-60 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase bg-[#14131D] px-1.5 py-0.5 rounded border border-borderDark text-textMuted">
                            {conn.relation}
                          </span>
                          <span className="text-[10px] font-mono text-textMuted">{conn.neighbor_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-semibold text-textMain truncate">{conn.neighbor_name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
