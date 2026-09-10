from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class Node(BaseModel):
    id: str
    type: str  # member, event, domain, project, policy
    name: str
    properties: Dict[str, Any] = Field(default_factory=dict)
    source: str


class Edge(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    source_file: str


class KnowledgeGraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RetrievalTraceStep(BaseModel):
    node_id: str
    node_name: str
    node_type: str
    depth: int
    relation: Optional[str] = None
    parent_id: Optional[str] = None


class SubgraphData(BaseModel):
    seed_nodes: List[str]
    nodes: List[Node]
    edges: List[Edge]
    max_depth: int = 2
    retrieval_trace: List[RetrievalTraceStep] = Field(default_factory=list)


class GraphHealth(BaseModel):
    status: str
    total_nodes: int
    total_edges: int
    orphans: int
    broken_references: int
    duplicate_ids: int
    reverse_edge_failures: int
    node_types_distribution: Dict[str, int]
    is_healthy: bool
    details: List[str] = Field(default_factory=list)
