import React, { useState, useEffect } from "react";
import { Sidebar, NavPage } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { CommandCenter } from "./pages/CommandCenter";
import { KnowledgeExplorer } from "./pages/KnowledgeExplorer";
import { QueryConsole } from "./pages/QueryConsole";
import { EventIntelligence } from "./pages/EventIntelligence";
import { PolicyCenter } from "./pages/PolicyCenter";
import { Diagnostics } from "./pages/Diagnostics";
import { SystemHealth } from "./types";
import { api } from "./services/api";

export function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>("command-center");
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [preferredMode, setPreferredMode] = useState<"gemini" | "offline">("gemini");

  // Cross-page state transfers
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const fetchTelemetry = () => {
    api
      .getHealth()
      .then((health) => {
        setSystemHealth(health);
      })
      .catch((err) => console.error("Health check error:", err));

    api
      .getMemory()
      .then((mem) => {
        setMemoryCount(mem.count);
      })
      .catch((err) => console.error("Memory check error:", err));
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handlers for cross-page navigation
  const handleRunSampleQuery = (query: string) => {
    setActiveQuery(query);
    setCurrentPage("query-console");
  };

  const handleFocusNodeInGraph = (nodeId: string) => {
    setFocusedNodeId(nodeId);
    setCurrentPage("knowledge-explorer");
  };

  const handleAskAboutEntity = (name: string) => {
    setActiveQuery(`Who is responsible for or involved in ${name}?`);
    setCurrentPage("query-console");
  };

  return (
    <div className="flex h-screen w-screen bg-[#0B0B12] text-[#F5F3F7] overflow-hidden font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        systemHealth={systemHealth}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Telemetry & Controls Bar */}
        <Topbar
          systemHealth={systemHealth}
          memoryCount={memoryCount}
          onMemoryCleared={fetchTelemetry}
          preferredMode={preferredMode}
          onTogglePreferredMode={setPreferredMode}
        />

        {/* Dynamic Pages */}
        <main className="flex-1 overflow-hidden relative">
          {currentPage === "command-center" && (
            <CommandCenter
              onNavigate={(page) => setCurrentPage(page)}
              onRunSampleQuery={handleRunSampleQuery}
            />
          )}

          {currentPage === "knowledge-explorer" && (
            <KnowledgeExplorer
              initialSelectedNodeId={focusedNodeId}
              onAskAboutNode={handleAskAboutEntity}
            />
          )}

          {currentPage === "query-console" && (
            <QueryConsole
              initialQuery={activeQuery}
              preferredMode={preferredMode}
              onSelectNodeInGraph={handleFocusNodeInGraph}
              onRefreshStats={fetchTelemetry}
            />
          )}

          {currentPage === "event-intelligence" && (
            <EventIntelligence
              onFocusEventInGraph={handleFocusNodeInGraph}
              onAskAboutEvent={handleAskAboutEntity}
            />
          )}

          {currentPage === "policy-center" && (
            <PolicyCenter
              onFocusPolicyInGraph={handleFocusNodeInGraph}
              onAskAboutPolicy={handleAskAboutEntity}
            />
          )}

          {currentPage === "diagnostics" && <Diagnostics />}
        </main>
      </div>
    </div>
  );
}

export default App;
