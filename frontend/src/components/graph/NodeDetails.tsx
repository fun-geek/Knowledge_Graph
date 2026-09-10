import React, { useEffect, useState } from "react";
import { Node } from "../../types";
import { NODE_COLORS } from "../../utils/colors";
import { api } from "../../services/api";
import { X, ExternalLink, GitFork, FileText, ArrowRight, ShieldCheck } from "lucide-react";

interface NodeDetailsProps {
  node: Node | null;
  onClose: () => void;
  onSelectNodeById?: (id: string) => void;
  onRunQueryAboutNode?: (nodeName: string) => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  onClose,
  onSelectNodeById,
  onRunQueryAboutNode,
}) => {
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [loadingNeighbors, setLoadingNeighbors] = useState(false);

  useEffect(() => {
    if (!node) return;
    setLoadingNeighbors(true);
    api
      .getNode(node.id)
      .then((data) => {
        setNeighbors(data.neighbors || []);
      })
      .catch((err) => console.error("Error fetching node neighbors:", err))
      .finally(() => setLoadingNeighbors(false));
  }, [node]);

  if (!node) return null;

  const color = NODE_COLORS[node.type] || "#6F2982";

  return (
    <div className="w-80 md:w-96 bg-[#14131D] border-l border-borderDark flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-borderDark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${color}25`, color: color }}
          >
            {node.type}
          </span>
          <span className="font-mono text-xs text-textMuted">{node.id}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#1C1A28] text-textMuted hover:text-textMain transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Node Title */}
        <div>
          <h3 className="text-lg font-bold text-textMain leading-snug">{node.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-textMuted mt-1">
            <FileText className="w-3.5 h-3.5 text-primaryPurple" />
            <span>Provenance:</span>
            <span className="font-mono text-textMain bg-[#0B0B12] px-1.5 py-0.5 rounded border border-borderDark">
              {node.source}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {onRunQueryAboutNode && (
          <button
            onClick={() => onRunQueryAboutNode(node.name)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#1C1A28] hover:bg-[#2A2638] text-xs font-semibold text-textMain rounded-lg border border-borderDark transition-all"
          >
            <span>Ask Graph about {node.name.length > 20 ? node.name.slice(0, 18) + "…" : node.name}</span>
            <ArrowRight className="w-3.5 h-3.5 text-aiBlue" />
          </button>
        )}

        {/* Properties Block */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono uppercase text-textMuted tracking-wider font-semibold">Properties</h4>
          <div className="bg-[#0B0B12] p-3 rounded-lg border border-borderDark space-y-2">
            {Object.entries(node.properties).map(([key, val]) => {
              if (key === "normalized_id") return null;
              return (
                <div key={key} className="text-xs">
                  <span className="text-textMuted capitalize font-mono">{key.replace(/_/g, " ")}: </span>
                  <span className="text-textMain font-medium">
                    {Array.isArray(val)
                      ? val.join(", ")
                      : typeof val === "object"
                      ? JSON.stringify(val)
                      : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connected Graph Neighbors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase text-textMuted tracking-wider font-semibold">
              Connected Relations ({neighbors.length})
            </h4>
            <GitFork className="w-3.5 h-3.5 text-textMuted" />
          </div>

          {loadingNeighbors ? (
            <div className="text-xs text-textMuted py-4 text-center">Loading relations...</div>
          ) : neighbors.length === 0 ? (
            <div className="text-xs text-textMuted py-3 text-center">No relations discovered.</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {neighbors.map((nbr, idx) => {
                const nbrColor = NODE_COLORS[nbr.neighbor_type as keyof typeof NODE_COLORS] || "#2B3AF3";
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectNodeById && onSelectNodeById(nbr.neighbor_id)}
                    className="p-2.5 bg-[#0B0B12] hover:bg-[#1C1A28] rounded-lg border border-borderDark flex flex-col gap-1 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-textMuted uppercase px-1.5 py-0.5 rounded bg-[#14131D] border border-borderDark">
                        {nbr.relation}
                      </span>
                      <span className="text-[10px] font-mono text-textMuted group-hover:text-textMain">
                        {nbr.neighbor_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: nbrColor }}
                      />
                      <span className="text-xs font-semibold text-textMain group-hover:text-white truncate">
                        {nbr.neighbor_name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
