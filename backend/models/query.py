from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.models.graph import SubgraphData


class QueryRequest(BaseModel):
    query: str
    mode: str = "gemini"  # "gemini" | "offline"
    max_hops: int = 2


class RetrievalRequest(BaseModel):
    query: str
    max_hops: int = 2


class EvidenceNode(BaseModel):
    id: str
    name: str
    type: str
    role_or_detail: str
    source: str


class WhyThisAnswer(BaseModel):
    step_01_entity_resolution: str
    step_02_graph_traversal: str
    step_03_relevant_context: List[str]
    step_04_reasoning: str
    step_05_verification: str


class QueryResponse(BaseModel):
    answer: str
    source_node_ids: List[str]
    evidence_nodes: List[EvidenceNode] = Field(default_factory=list)
    confidence: float
    reasoning_summary: str
    mode: str  # "GEMINI ENHANCED" | "OFFLINE ENGINE"
    retrieval: Dict[str, Any]
    subgraph: SubgraphData
    memory_used: bool
    verification_status: str  # "VERIFIED" | "WARNING"
    why_this_answer: WhyThisAnswer


class MemoryItem(BaseModel):
    query: str
    answer: str
    source_node_ids: List[str]
    timestamp: str


class DiagnosticItem(BaseModel):
    name: str
    status: str  # "PASS" | "FAIL"
    detail: str
    latency_ms: Optional[float] = None
    source_node_ids: Optional[List[str]] = None
