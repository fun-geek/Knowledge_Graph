"""
main.py - Campus Collective FastAPI Application
==============================================
Exposes REST endpoints for graph analytics, 2-hop traversal,
entity resolution, Gemini reasoning, deterministic offline QA,
and diagnostics.
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models.graph import GraphHealth, KnowledgeGraphData, Node, SubgraphData
from backend.models.query import DiagnosticItem, QueryRequest, QueryResponse, RetrievalRequest
from backend.services.gemini_service import gemini_service
from backend.services.graph_builder import graph_manager
from backend.services.memory import memory_manager
from backend.services.qa_engine import qa_engine
from backend.services.retriever import graph_retriever
from backend.services.validator import GraphValidator

app = FastAPI(
    title="Campus Collective — Knowledge Graph & AI QA Engine",
    description="Interactive Campus Intelligence System with 2-Hop Graph Traversal and Grounded Reasoning",
    version="2.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def get_health() -> Dict[str, Any]:
    gemini_avail = gemini_service.is_available()
    return {
        "status": "ONLINE",
        "graph_online": True,
        "nodes_loaded": len(graph_manager.nodes_dict),
        "edges_loaded": len(graph_manager.edges_list),
        "gemini_available": gemini_avail,
        "gemini_mode": "GEMINI ENHANCED" if gemini_avail else "OFFLINE ENGINE",
        "memory_status": memory_manager.get_status()["label"],
        "retrieval_ready": True,
        "source_validation_active": True
    }


@app.get("/api/stats")
def get_stats() -> Dict[str, Any]:
    nodes = list(graph_manager.nodes_dict.values())
    edges = graph_manager.edges_list

    type_counts: Dict[str, int] = {}
    domain_dist: Dict[str, int] = {}

    for n in nodes:
        type_counts[n.type] = type_counts.get(n.type, 0) + 1
        if n.type == "event":
            d = n.properties.get("domain", "Other")
            domain_dist[d] = domain_dist.get(d, 0) + 1

    health = GraphValidator.audit_graph(
        {"nodes": [n.model_dump() for n in nodes], "edges": [e.model_dump() for e in edges]},
        graph_manager.graph
    )

    return {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "members_count": type_counts.get("member", 0),
        "events_count": type_counts.get("event", 0),
        "domains_count": type_counts.get("domain", 0),
        "projects_count": type_counts.get("project", 0),
        "policies_count": type_counts.get("policy", 0),
        "domain_distribution": domain_dist,
        "graph_health": health.model_dump()
    }


@app.get("/api/graph", response_model=KnowledgeGraphData)
def get_full_graph() -> KnowledgeGraphData:
    return graph_manager.get_full_graph_data()


@app.get("/api/nodes/{node_id}")
def get_node_details(node_id: str) -> Dict[str, Any]:
    node = graph_manager.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found.")
    neighbors = graph_manager.get_neighbors(node_id)
    return {
        "node": node.model_dump(),
        "neighbors": neighbors,
        "degree": len(neighbors)
    }


@app.post("/api/retrieve", response_model=SubgraphData)
def retrieve_subgraph_endpoint(req: RetrievalRequest) -> SubgraphData:
    subgraph = graph_retriever.retrieve_subgraph(req.query, max_hops=req.max_hops)
    return subgraph


@app.post("/api/query", response_model=QueryResponse)
def query_engine_endpoint(req: QueryRequest) -> QueryResponse:
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    response = qa_engine.process_query(req)
    return response


@app.get("/api/events")
def get_events() -> List[Dict[str, Any]]:
    events = []
    for n in graph_manager.nodes_dict.values():
        if n.type == "event":
            # Find lead member
            neighbors = graph_manager.get_neighbors(n.id)
            lead_name = "Assigned Lead"
            lead_id = None
            for nbr in neighbors:
                if nbr.get("relation") == "LED_BY":
                    lead_name = nbr.get("neighbor_name", lead_name)
                    lead_id = nbr.get("neighbor_id")
                    break

            events.append({
                "id": n.id,
                "name": n.name,
                "date": n.properties.get("date"),
                "domain": n.properties.get("domain"),
                "attendee_count": n.properties.get("attendee_count"),
                "lead_email": n.properties.get("lead_email"),
                "lead_name": lead_name,
                "lead_id": lead_id,
                "source": n.source
            })
    # Sort by date
    events.sort(key=lambda x: str(x.get("date", "")))
    return events


@app.get("/api/policies")
def get_policies() -> List[Dict[str, Any]]:
    policies = []
    for n in graph_manager.nodes_dict.values():
        if n.type == "policy":
            neighbors = graph_manager.get_neighbors(n.id)
            policies.append({
                "id": n.id,
                "name": n.name,
                "properties": n.properties,
                "connected_entities": neighbors,
                "source": n.source
            })
    policies.sort(key=lambda x: x["id"])
    return policies


@app.get("/api/memory")
def get_memory() -> Dict[str, Any]:
    return memory_manager.get_status()


@app.post("/api/memory/clear")
def clear_memory() -> Dict[str, str]:
    memory_manager.clear()
    return {"message": "Memory cleared successfully."}


@app.get("/api/diagnostics")
def run_diagnostics() -> Dict[str, Any]:
    # 1. Audit Graph Health
    nodes_raw = [n.model_dump() for n in graph_manager.nodes_dict.values()]
    edges_raw = [e.model_dump() for e in graph_manager.edges_list]
    health = GraphValidator.audit_graph(
        {"nodes": nodes_raw, "edges": edges_raw},
        graph_manager.graph
    )

    # 2. Benchmark Retrieval Test Suite
    benchmark_queries = [
        {
            "name": "GPU access approval",
            "query": "Who must approve restricted GPU access?",
            "expected_ids": ["POL003", "M008", "M003"]
        },
        {
            "name": "AI/ML events",
            "query": "Who leads AI/ML events?",
            "expected_ids": ["M003"]
        },
        {
            "name": "Cloud lead",
            "query": "Who is the cloud lead?",
            "expected_ids": ["M004"]
        },
        {
            "name": "100+ attendee approval",
            "query": "Who gives final approval for events above 100 attendees?",
            "expected_ids": ["POL004", "M001"]
        },
        {
            "name": "Robotics lab access",
            "query": "Who manages robotics lab access?",
            "expected_ids": ["POL003", "M008"]
        }
    ]

    test_results: List[DiagnosticItem] = []
    for test in benchmark_queries:
        start_time = time.perf_counter()
        res = qa_engine.process_query(QueryRequest(query=test["query"], mode="offline"))
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Check if all expected IDs are present in returned source IDs
        retrieved_set = set(res.source_node_ids)
        passed = all(eid in retrieved_set for eid in test["expected_ids"])

        status = "PASS" if passed else "FAIL"
        detail = (
            f"Successfully resolved expected node(s) {test['expected_ids']} in {duration_ms}ms"
            if passed
            else f"Missing expected node(s) {test['expected_ids']}. Got {res.source_node_ids}"
        )

        test_results.append(DiagnosticItem(
            name=test["name"],
            status=status,
            detail=detail,
            latency_ms=duration_ms,
            source_node_ids=res.source_node_ids
        ))

    return {
        "graph_health": health.model_dump(),
        "retrieval_tests": [t.model_dump() for t in test_results],
        "all_tests_passed": all(t.status == "PASS" for t in test_results),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
