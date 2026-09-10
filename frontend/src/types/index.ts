export type NodeType = "member" | "event" | "domain" | "project" | "policy";

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  properties: Record<string, any>;
  source: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  relation: string;
  source_file: string;
}

export interface KnowledgeGraphData {
  nodes: Node[];
  edges: Edge[];
  metadata: Record<string, any>;
}

export interface RetrievalTraceStep {
  node_id: string;
  node_name: string;
  node_type: string;
  depth: number;
  relation?: string | null;
  parent_id?: string | null;
}

export interface SubgraphData {
  seed_nodes: string[];
  nodes: Node[];
  edges: Edge[];
  max_depth: number;
  retrieval_trace: RetrievalTraceStep[];
}

export interface GraphHealth {
  status: string;
  total_nodes: number;
  total_edges: number;
  orphans: number;
  broken_references: number;
  duplicate_ids: number;
  reverse_edge_failures: number;
  node_types_distribution: Record<string, number>;
  is_healthy: boolean;
  details: string[];
}

export interface EvidenceNode {
  id: string;
  name: string;
  type: string;
  role_or_detail: string;
  source: string;
}

export interface WhyThisAnswer {
  step_01_entity_resolution: string;
  step_02_graph_traversal: string;
  step_03_relevant_context: string[];
  step_04_reasoning: string;
  step_05_verification: string;
}

export interface QueryResponse {
  answer: string;
  source_node_ids: string[];
  evidence_nodes: EvidenceNode[];
  confidence: number;
  reasoning_summary: string;
  mode: string;
  retrieval: {
    seed_nodes: string[];
    max_depth: number;
    nodes_retrieved: number;
    edges_retrieved: number;
  };
  subgraph: SubgraphData;
  memory_used: boolean;
  verification_status: "VERIFIED" | "WARNING";
  why_this_answer: WhyThisAnswer;
}

export interface DiagnosticItem {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
  latency_ms?: number;
  source_node_ids?: string[];
}

export interface DiagnosticsResponse {
  graph_health: GraphHealth;
  retrieval_tests: DiagnosticItem[];
  all_tests_passed: boolean;
  timestamp: string;
}

export interface EventItem {
  id: string;
  name: string;
  date: string;
  domain: string;
  attendee_count: number;
  lead_email: string;
  lead_name: string;
  lead_id?: string;
  source: string;
}

export interface PolicyItem {
  id: string;
  name: string;
  properties: Record<string, any>;
  connected_entities: Array<{
    neighbor_id: string;
    neighbor_name: string;
    neighbor_type: string;
    relation: string;
    edge_id: string;
    source_file: string;
  }>;
  source: string;
}

export interface SystemHealth {
  status: string;
  graph_online: boolean;
  nodes_loaded: number;
  edges_loaded: number;
  gemini_available: boolean;
  gemini_mode: string;
  memory_status: string;
  retrieval_ready: boolean;
  source_validation_active: boolean;
}

export interface StatsResponse {
  total_nodes: number;
  total_edges: number;
  members_count: number;
  events_count: number;
  domains_count: number;
  projects_count: number;
  policies_count: number;
  domain_distribution: Record<string, number>;
  graph_health: GraphHealth;
}
