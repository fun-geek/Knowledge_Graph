import {
  DiagnosticsResponse,
  EventItem,
  KnowledgeGraphData,
  PolicyItem,
  QueryResponse,
  StatsResponse,
  SubgraphData,
  SystemHealth,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => fetchJson<SystemHealth>("/api/health"),
  getStats: () => fetchJson<StatsResponse>("/api/stats"),
  getGraph: () => fetchJson<KnowledgeGraphData>("/api/graph"),
  getNode: (id: string) => fetchJson<any>(`/api/nodes/${encodeURIComponent(id)}`),
  runQuery: (query: string, mode: "gemini" | "offline" = "gemini", max_hops: number = 2) =>
    fetchJson<QueryResponse>("/api/query", {
      method: "POST",
      body: JSON.stringify({ query, mode, max_hops }),
    }),
  retrieveSubgraph: (query: string, max_hops: number = 2) =>
    fetchJson<SubgraphData>("/api/retrieve", {
      method: "POST",
      body: JSON.stringify({ query, max_hops }),
    }),
  getEvents: () => fetchJson<EventItem[]>("/api/events"),
  getPolicies: () => fetchJson<PolicyItem[]>("/api/policies"),
  getDiagnostics: () => fetchJson<DiagnosticsResponse>("/api/diagnostics"),
  getMemory: () => fetchJson<{ count: number; max_capacity: number; label: string; items: any[] }>("/api/memory"),
  clearMemory: () => fetchJson<{ message: string }>("/api/memory/clear", { method: "POST" }),
};
