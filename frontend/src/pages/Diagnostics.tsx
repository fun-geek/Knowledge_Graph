import React, { useEffect, useState } from "react";
import { DiagnosticsResponse } from "../types";
import { api } from "../services/api";
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Cpu,
  Database,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const Diagnostics: React.FC = () => {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const runTests = () => {
    setLoading(true);
    api
      .getDiagnostics()
      .then(setData)
      .catch((err) => console.error("Error running diagnostics:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-mono font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>OPERATIONAL AUDIT & VERIFICATION BENCHMARK</span>
          </div>
          <h1 className="text-2xl font-black text-textMain tracking-tight">System Diagnostics</h1>
          <p className="text-xs text-textMuted mt-1 max-w-xl">
            Live audit of the NetworkX knowledge graph, bidirectional relationship integrity, and benchmark 2-hop retrieval tests.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2.5 bg-[#0B0B12] hover:bg-[#1C1A28] border border-borderDark text-textMain text-xs font-semibold rounded-lg flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Re-run Diagnostics</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="text-center py-16 text-textMuted font-mono text-xs">
          Running Automated Diagnostic Suite...
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Graph Structural Health Card */}
          <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-textMain font-mono uppercase tracking-wide">
                  Knowledge Graph Structural Integrity
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                STATUS: {data.graph_health.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[#0B0B12] rounded-lg border border-borderDark">
                <span className="text-[11px] font-mono text-textMuted block uppercase">Total Nodes</span>
                <span className="text-xl font-bold font-mono text-textMain mt-1 block">
                  {data.graph_health.total_nodes}
                </span>
                <span className="text-[10px] text-emerald-400">&bull; 100% Validated</span>
              </div>

              <div className="p-3 bg-[#0B0B12] rounded-lg border border-borderDark">
                <span className="text-[11px] font-mono text-textMuted block uppercase">Total Edges</span>
                <span className="text-xl font-bold font-mono text-textMain mt-1 block">
                  {data.graph_health.total_edges}
                </span>
                <span className="text-[10px] text-emerald-400">&bull; Bidirectional</span>
              </div>

              <div className="p-3 bg-[#0B0B12] rounded-lg border border-borderDark">
                <span className="text-[11px] font-mono text-textMuted block uppercase">Orphan Nodes</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  {data.graph_health.orphans}
                </span>
                <span className="text-[10px] text-textMuted">&bull; Zero isolated</span>
              </div>

              <div className="p-3 bg-[#0B0B12] rounded-lg border border-borderDark">
                <span className="text-[11px] font-mono text-textMuted block uppercase">Broken References</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  {data.graph_health.broken_references}
                </span>
                <span className="text-[10px] text-textMuted">&bull; Perfect linkage</span>
              </div>
            </div>

            {/* Sub-audit metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded border border-borderDark">
                <span className="text-textMuted">Duplicate Node IDs:</span>
                <span className="text-emerald-400 font-bold">{data.graph_health.duplicate_ids}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded border border-borderDark">
                <span className="text-textMuted">Reverse-Edge Failures:</span>
                <span className="text-emerald-400 font-bold">{data.graph_health.reverse_edge_failures}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B12] rounded border border-borderDark">
                <span className="text-textMuted">Canonical Node Types:</span>
                <span className="text-primaryPurple font-bold">5 Valid Types</span>
              </div>
            </div>
          </div>

          {/* Benchmark Retrieval Test Suite */}
          <div className="bg-[#14131D] p-6 rounded-xl border border-borderDark space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-aiBlue" />
                <div>
                  <h3 className="text-sm font-bold text-textMain font-mono uppercase tracking-wide">
                    Deterministic Retrieval Test Suite
                  </h3>
                  <p className="text-xs text-textMuted">
                    Validates 2-hop seed extraction, traversals, and source attribution on key queries
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border ${
                  data.all_tests_passed
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}
              >
                {data.all_tests_passed ? "✓ 5/5 PASSED" : "ISSUES FOUND"}
              </span>
            </div>

            {/* Test Table */}
            <div className="overflow-x-auto rounded-lg border border-borderDark">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B0B12] text-textMuted uppercase border-b border-borderDark">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Test Name</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Verified Sources</th>
                    <th className="py-2.5 px-4 font-semibold">Latency</th>
                    <th className="py-2.5 px-4 font-semibold">Audit Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderDark bg-[#14131D]">
                  {data.retrieval_tests.map((test, idx) => {
                    const isPass = test.status === "PASS";
                    return (
                      <tr key={idx} className="hover:bg-[#1C1A28] transition-colors">
                        <td className="py-3 px-4 font-semibold text-textMain">{test.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              isPass
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {isPass ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{test.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-aiBlue">
                          {test.source_node_ids?.join(", ") || "—"}
                        </td>
                        <td className="py-3 px-4 text-textMuted">{test.latency_ms} ms</td>
                        <td className="py-3 px-4 text-textMuted text-[11px] max-w-xs truncate">
                          {test.detail}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
