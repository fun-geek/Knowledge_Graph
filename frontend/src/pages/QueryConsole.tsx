import React, { useState, useEffect } from "react";
import { GraphCanvas } from "../components/graph/GraphCanvas";
import { KnowledgeGraphData, QueryResponse, Node } from "../types";
import { api } from "../services/api";
import { NODE_COLORS } from "../utils/colors";
import {
  Search,
  Sparkles,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Layers,
  FileCheck,
  Radio,
  FileText,
} from "lucide-react";

interface QueryConsoleProps {
  initialQuery?: string;
  preferredMode: "gemini" | "offline";
  onSelectNodeInGraph?: (nodeId: string) => void;
  onRefreshStats?: () => void;
}

export const QueryConsole: React.FC<QueryConsoleProps> = ({
  initialQuery = "",
  preferredMode,
  onSelectNodeInGraph,
  onRefreshStats,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<"gemini" | "offline">(preferredMode);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [fullGraph, setFullGraph] = useState<KnowledgeGraphData | null>(null);
  const [showWhyThisAnswer, setShowWhyThisAnswer] = useState(true);

  // Synchronize preferred mode if changed externally
  useEffect(() => {
    setMode(preferredMode);
  }, [preferredMode]);

  // Load full graph for the background canvas
  useEffect(() => {
    api.getGraph().then(setFullGraph).catch(console.error);
  }, []);

  // Pre-fill query if prop provided
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const benchmarkQueries = [
    "Who must approve restricted GPU access?",
    "Who leads AI/ML events?",
    "Who is the cloud lead?",
    "Who gives final approval for events above 100 attendees?",
    "Who manages robotics lab access?",
  ];

  const handleRunQuery = async (queryToRun?: string) => {
    const q = (queryToRun || query).trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setQueryResult(null);
    setCurrentStep(1); // Step 1: Resolving entities

    try {
      // Step 2: Traversal animation start
      setTimeout(() => setCurrentStep(2), 350);
      setTimeout(() => setCurrentStep(3), 700);
      setTimeout(() => setCurrentStep(4), 1050);

      const res = await api.runQuery(q, mode, 2);

      setTimeout(() => {
        setCurrentStep(5); // Reasoning
        setTimeout(() => {
          setQueryResult(res);
          setCurrentStep(6); // Done
          setLoading(false);
          if (onRefreshStats) onRefreshStats();
        }, 400);
      }, 1200);
    } catch (err: any) {
      console.error("Query failed:", err);
      setLoading(false);
      setCurrentStep(0);
    }
  };

  // Derive highlight IDs for visual traversal
  const seedIds = queryResult?.retrieval.seed_nodes || [];
  const hop1Ids =
    queryResult?.subgraph.retrieval_trace
      .filter((t) => t.depth === 1)
      .map((t) => t.node_id) || [];
  const hop2Ids =
    queryResult?.subgraph.retrieval_trace
      .filter((t) => t.depth === 2)
      .map((t) => t.node_id) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#0B0B12]">
      {/* Search Bar Header */}
      <div className="p-4 bg-[#14131D] border-b border-borderDark flex flex-col gap-3 shadow-md z-10">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input
              type="text"
              placeholder="Ask the campus knowledge graph (e.g. Who must approve restricted GPU access?)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRunQuery()}
              className="w-full bg-[#0B0B12] text-sm text-textMain pl-10 pr-4 py-2.5 rounded-lg border border-borderDark focus:outline-none focus:border-primaryPurple transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Mode Switcher */}
            <div className="flex items-center bg-[#0B0B12] p-1 rounded-lg border border-borderDark">
              <button
                onClick={() => setMode("gemini")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  mode === "gemini"
                    ? "bg-aiBlue text-white shadow-sm shadow-aiBlue"
                    : "text-textMuted hover:text-textMain"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini</span>
              </button>
              <button
                onClick={() => setMode("offline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  mode === "offline"
                    ? "bg-primaryPurple text-white shadow-sm shadow-primaryPurple"
                    : "text-textMuted hover:text-textMain"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Offline</span>
              </button>
            </div>

            {/* TRACE QUERY button */}
            <button
              onClick={() => handleRunQuery()}
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-primaryPurple to-aiBlue hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-primaryPurple/30 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>TRACING GRAPH...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>TRACE QUERY</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Benchmark Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-mono uppercase text-textMuted flex-shrink-0">
            Suggested:
          </span>
          {benchmarkQueries.map((bq, idx) => (
            <button
              key={idx}
              onClick={() => handleRunQuery(bq)}
              className="bg-[#0B0B12] hover:bg-[#1C1A28] border border-borderDark px-2.5 py-1 rounded text-xs text-textMuted hover:text-textMain transition-all whitespace-nowrap flex-shrink-0"
            >
              {bq}
            </button>
          ))}
        </div>
      </div>

      {/* Traversal Pipeline Progress Bar (When processing) */}
      {loading && (
        <div className="bg-[#14131D] border-b border-borderDark px-6 py-2 flex items-center justify-between text-xs font-mono text-textMuted">
          <div className="flex items-center gap-4">
            <span className={currentStep >= 1 ? "text-primaryPurple font-bold" : ""}>
              01 Resolving Entities
            </span>
            <span>&rarr;</span>
            <span className={currentStep >= 2 ? "text-primaryPurple font-bold" : ""}>
              02 Seed Nodes
            </span>
            <span>&rarr;</span>
            <span className={currentStep >= 3 ? "text-aiBlue font-bold" : ""}>
              03 1-Hop Neighbors
            </span>
            <span>&rarr;</span>
            <span className={currentStep >= 4 ? "text-aiBlue font-bold" : ""}>
              04 2-Hop Subgraph
            </span>
            <span>&rarr;</span>
            <span className={currentStep >= 5 ? "text-emerald-400 font-bold" : ""}>
              05 Grounded Reasoning
            </span>
          </div>
          <span className="animate-pulse text-aiBlue font-semibold">Strict 2-Hop Traversal</span>
        </div>
      )}

      {/* Main Split Layout: Left Graph Traversal View, Right Intelligence Report */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Interactive Graph Traversal View */}
        <div className="flex-1 h-1/2 lg:h-full relative border-r border-borderDark">
          {fullGraph ? (
            <GraphCanvas
              nodes={fullGraph.nodes}
              edges={fullGraph.edges}
              activeSubgraph={queryResult?.subgraph || null}
              highlightSeedIds={seedIds}
              highlightHop1Ids={hop1Ids}
              highlightHop2Ids={hop2Ids}
              height="h-full"
              showControls={true}
              onSelectNode={(n) => {
                if (n && onSelectNodeInGraph) onSelectNodeInGraph(n.id);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-textMuted font-mono text-xs">
              Initializing Graph Engine...
            </div>
          )}

          {/* Overlay Status Pill */}
          {queryResult && (
            <div className="absolute top-3 right-3 bg-[#14131D]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-borderDark text-[11px] font-mono text-textMuted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                SUBGRAPH: {queryResult.subgraph.nodes.length} Nodes &bull; {queryResult.subgraph.edges.length} Edges (2 Hops)
              </span>
            </div>
          )}
        </div>

        {/* Right Intelligence Report Panel */}
        <div className="w-full lg:w-[480px] h-1/2 lg:h-full bg-[#14131D] flex flex-col overflow-y-auto border-t lg:border-t-0 border-borderDark">
          {queryResult ? (
            <div className="p-6 space-y-6">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-aiBlue/20 text-aiBlue border border-aiBlue/30">
                    INTELLIGENCE REPORT
                  </span>
                  <span className="text-xs font-mono text-textMuted">
                    CONFIDENCE: {Math.round(queryResult.confidence * 100)}%
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    queryResult.verification_status === "VERIFIED"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {queryResult.verification_status === "VERIFIED"
                    ? "✓ SOURCES VERIFIED"
                    : "⚠ SOURCE WARNING"}
                </span>
              </div>

              {/* Verified Answer Card */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-widest text-textMuted font-bold">
                  ANSWER
                </div>
                <div className="p-4 rounded-xl bg-[#0B0B12] border border-borderDark text-sm text-textMain leading-relaxed font-sans shadow-inner">
                  {queryResult.answer}
                </div>
              </div>

              {/* Mode & Retrieval Telemetry */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0B0B12] p-3 rounded-lg border border-borderDark">
                <div>
                  <span className="text-textMuted">ENGINE: </span>
                  <span className="text-textMain font-semibold">{queryResult.mode}</span>
                </div>
                <div>
                  <span className="text-textMuted">MAX HOPS: </span>
                  <span className="text-textMain font-semibold">2 HOPS (STRICT)</span>
                </div>
                <div>
                  <span className="text-textMuted">SEEDS: </span>
                  <span className="text-primaryPurple font-semibold">
                    {queryResult.retrieval.seed_nodes.join(", ")}
                  </span>
                </div>
                <div>
                  <span className="text-textMuted">NODES VISITED: </span>
                  <span className="text-textMain font-semibold">
                    {queryResult.retrieval.nodes_retrieved}
                  </span>
                </div>
              </div>

              {/* Evidence / Source Nodes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-textMuted font-bold">
                    VERIFIED EVIDENCE NODES ({queryResult.evidence_nodes.length})
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                <div className="space-y-2">
                  {queryResult.evidence_nodes.map((ev, idx) => {
                    const evColor = NODE_COLORS[ev.type as keyof typeof NODE_COLORS] || "#2B3AF3";
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#0B0B12] border border-borderDark flex flex-col gap-1 hover:border-opacity-60 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                              style={{ backgroundColor: `${evColor}22`, color: evColor }}
                            >
                              {ev.type}
                            </span>
                            <span className="font-mono text-xs font-semibold text-textMain">
                              {ev.id}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-textMuted bg-[#14131D] px-1.5 py-0.5 rounded border border-borderDark">
                            {ev.source}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-textMain mt-0.5">{ev.name}</p>
                        {ev.role_or_detail && (
                          <p className="text-[11px] text-textMuted">{ev.role_or_detail}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Retrieval Trace Diagram */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-widest text-textMuted font-bold flex items-center justify-between">
                  <span>RETRIEVAL TRACE (2-HOP BFS)</span>
                  <GitBranch className="w-3.5 h-3.5 text-textMuted" />
                </div>

                <div className="bg-[#0B0B12] p-3 rounded-lg border border-borderDark space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
                  {queryResult.subgraph.retrieval_trace.slice(0, 10).map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-textMuted">
                      <span className="w-4 text-right text-[10px] text-textMuted">
                        {step.depth === 0 ? "★" : `d${step.depth}`}
                      </span>
                      <span className="text-textMain font-semibold">{step.node_id}</span>
                      <span className="text-[10px] text-textMuted">({step.node_name})</span>
                      {step.relation && (
                        <span className="text-[9px] px-1 bg-[#14131D] rounded border border-borderDark text-primaryPurple">
                          {step.relation}
                        </span>
                      )}
                    </div>
                  ))}
                  {queryResult.subgraph.retrieval_trace.length > 10 && (
                    <div className="text-[10px] text-textMuted pt-1 italic">
                      + {queryResult.subgraph.retrieval_trace.length - 10} additional 2-hop edges traced
                    </div>
                  )}
                </div>
              </div>

              {/* "Why This Answer?" 5-Step Explanation Accordion */}
              <div className="border border-borderDark rounded-xl overflow-hidden bg-[#0B0B12]">
                <button
                  onClick={() => setShowWhyThisAnswer(!showWhyThisAnswer)}
                  className="w-full p-3 bg-[#14131D] flex items-center justify-between text-xs font-mono font-bold text-textMain uppercase tracking-wider"
                >
                  <span>WHY THIS ANSWER?</span>
                  {showWhyThisAnswer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showWhyThisAnswer && (
                  <div className="p-4 space-y-3.5 text-xs">
                    <div>
                      <div className="font-mono text-primaryPurple text-[11px] font-bold">
                        01 &bull; Entity Resolution
                      </div>
                      <p className="text-textMuted mt-0.5">
                        {queryResult.why_this_answer.step_01_entity_resolution}
                      </p>
                    </div>

                    <div>
                      <div className="font-mono text-primaryPurple text-[11px] font-bold">
                        02 &bull; Graph Traversal
                      </div>
                      <p className="text-textMuted mt-0.5">
                        {queryResult.why_this_answer.step_02_graph_traversal}
                      </p>
                    </div>

                    <div>
                      <div className="font-mono text-primaryPurple text-[11px] font-bold">
                        03 &bull; Relevant Context Subgraph
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {queryResult.why_this_answer.step_03_relevant_context.map((ctx, idx) => (
                          <span
                            key={idx}
                            className="bg-[#14131D] px-2 py-0.5 rounded text-[10px] font-mono text-textMain border border-borderDark"
                          >
                            {ctx}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-mono text-primaryPurple text-[11px] font-bold">
                        04 &bull; Reasoning Layer
                      </div>
                      <p className="text-textMuted mt-0.5">
                        {queryResult.why_this_answer.step_04_reasoning}
                      </p>
                    </div>

                    <div>
                      <div className="font-mono text-emerald-400 text-[11px] font-bold">
                        05 &bull; Source ID Validation
                      </div>
                      <p className="text-textMuted mt-0.5">
                        {queryResult.why_this_answer.step_05_verification}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center text-textMuted space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0B0B12] border border-borderDark flex items-center justify-center">
                <Radio className="w-6 h-6 text-textMuted" />
              </div>
              <h4 className="text-sm font-bold text-textMain font-mono uppercase">
                Awaiting Query Execution
              </h4>
              <p className="text-xs text-textMuted max-w-xs leading-relaxed">
                Enter an inquiry above or select a benchmark chip to trace the 2-hop graph subgraph and generate a verified intelligence report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
