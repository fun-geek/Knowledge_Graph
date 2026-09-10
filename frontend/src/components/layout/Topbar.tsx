import React from "react";
import { SystemHealth } from "../../types";
import { Sparkles, Cpu, RotateCcw, Database, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";

interface TopbarProps {
  systemHealth: SystemHealth | null;
  memoryCount: number;
  maxMemoryCapacity?: number;
  onMemoryCleared?: () => void;
  preferredMode: "gemini" | "offline";
  onTogglePreferredMode: (mode: "gemini" | "offline") => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  systemHealth,
  memoryCount,
  maxMemoryCapacity = 3,
  onMemoryCleared,
  preferredMode,
  onTogglePreferredMode,
}) => {
  const handleClearMemory = async () => {
    try {
      await api.clearMemory();
      if (onMemoryCleared) onMemoryCleared();
    } catch (err) {
      console.error("Failed to clear memory:", err);
    }
  };

  const isGeminiLive = systemHealth?.gemini_available;

  return (
    <header className="h-16 bg-[#14131D] border-b border-borderDark px-6 flex items-center justify-between select-none">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-textMain tracking-wide">
            Campus Collective
          </h2>
          <p className="text-[10px] font-mono text-textMuted tracking-wider">
            Knowledge Intelligence System &bull; Graph-Grounded QA
          </p>
        </div>
      </div>

      {/* Right Telemetry & Controls */}
      <div className="flex items-center gap-4">
        {/* Graph Status Chip */}
        <div className="hidden sm:flex items-center gap-2 bg-[#0B0B12] px-3 py-1.5 rounded-lg border border-borderDark text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-textMuted">GRAPH:</span>
          <span className="text-emerald-400 font-semibold">ONLINE</span>
        </div>

        {/* Short Term Memory Pill */}
        <div className="flex items-center gap-2 bg-[#0B0B12] px-3 py-1.5 rounded-lg border border-borderDark text-xs font-mono">
          <span className="text-textMuted">MEMORY:</span>
          <span className="text-textMain font-semibold">
            {memoryCount} / {maxMemoryCapacity}
          </span>
          {memoryCount > 0 && (
            <button
              onClick={handleClearMemory}
              title="Clear Short-Term Memory"
              className="p-1 hover:bg-[#1C1A28] rounded text-textMuted hover:text-policyRed transition-colors ml-1"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Mode Toggle Selector */}
        <div className="flex items-center bg-[#0B0B12] p-1 rounded-lg border border-borderDark">
          <button
            onClick={() => onTogglePreferredMode("gemini")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              preferredMode === "gemini"
                ? "bg-aiBlue text-white shadow-md shadow-aiBlue/30"
                : "text-textMuted hover:text-textMain"
            }`}
            title={isGeminiLive ? "Gemini API Active" : "No API key configured (runs offline fallback)"}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini Mode</span>
          </button>
          <button
            onClick={() => onTogglePreferredMode("offline")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              preferredMode === "offline"
                ? "bg-primaryPurple text-white shadow-md shadow-primaryPurple/30"
                : "text-textMuted hover:text-textMain"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Offline Engine</span>
          </button>
        </div>
      </div>
    </header>
  );
};
