import React, { useEffect, useState } from "react";
import { GraphCanvas } from "../components/graph/GraphCanvas";
import { NodeDetails } from "../components/graph/NodeDetails";
import { KnowledgeGraphData, Node } from "../types";
import { api } from "../services/api";
import { Info, Sparkles, SlidersHorizontal, RefreshCw } from "lucide-react";

interface KnowledgeExplorerProps {
  initialSelectedNodeId?: string | null;
  onAskAboutNode?: (nodeName: string) => void;
}

export const KnowledgeExplorer: React.FC<KnowledgeExplorerProps> = ({
  initialSelectedNodeId,
  onAskAboutNode,
}) => {
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = () => {
    setLoading(true);
    api
      .getGraph()
      .then((data) => {
        setGraphData(data);
        if (initialSelectedNodeId) {
          const found = data.nodes.find((n) => n.id === initialSelectedNodeId);
          if (found) setSelectedNode(found);
        }
      })
      .catch((err) => console.error("Error fetching graph data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGraph();
  }, [initialSelectedNodeId]);

  const handleSelectNodeById = (nodeId: string) => {
    if (!graphData) return;
    const target = graphData.nodes.find((n) => n.id === nodeId);
    if (target) setSelectedNode(target);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden relative">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
        {/* Top Explorer Bar */}
        <div className="flex items-center justify-between bg-[#14131D] px-4 py-2.5 rounded-xl border border-borderDark shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-textMain tracking-wide uppercase font-mono">
              Campus Knowledge Graph Explorer
            </h2>
            <span className="text-xs text-textMuted hidden sm:inline">
              &bull; Interactive Physics Simulation &bull; Drag, Zoom & Pan
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-textMuted bg-[#0B0B12] px-2.5 py-1 rounded border border-borderDark">
              {graphData ? `${graphData.nodes.length} Nodes &bull; ${graphData.edges.length} Edges` : "Loading..."}
            </span>
            <button
              onClick={fetchGraph}
              className="p-1.5 rounded hover:bg-[#1C1A28] text-textMuted hover:text-textMain transition-colors"
              title="Refresh Graph Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* The Graph Canvas */}
        <div className="flex-1 rounded-xl overflow-hidden border border-borderDark relative">
          {graphData ? (
            <GraphCanvas
              nodes={graphData.nodes}
              edges={graphData.edges}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(n) => setSelectedNode(n)}
              height="h-full"
              showControls={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-[#0B0B12] text-textMuted font-mono text-xs">
              Loading Knowledge Graph Nodes &amp; Edges...
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Inspector Drawer */}
      {selectedNode && (
        <NodeDetails
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSelectNodeById={handleSelectNodeById}
          onRunQueryAboutNode={onAskAboutNode}
        />
      )}
    </div>
  );
};
