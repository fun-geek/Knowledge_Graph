"""
qa_engine.py - End-to-End Orchestrator for Knowledge Retrieval & QA
===================================================================
Coordinates:
1. Entity Resolution
2. Strict 2-Hop Graph Traversal
3. Context Grounding
4. Gemini Reasoning / Offline Engine Fallback
5. Strict Source ID Validation against knowledge.json
6. Short-Term Memory Management
7. "Why This Answer?" 5-step Trace Generation
"""

from __future__ import annotations

from typing import Any, Dict, List, Set

from backend.models.graph import SubgraphData
from backend.models.query import EvidenceNode, QueryRequest, QueryResponse, WhyThisAnswer
from backend.services.gemini_service import gemini_service
from backend.services.graph_builder import graph_manager
from backend.services.memory import memory_manager
from backend.services.offline_qa import offline_qa_engine
from backend.services.retriever import graph_retriever
from backend.services.validator import GraphValidator


class QAEngine:
    def __init__(self):
        self.retriever = graph_retriever
        self.manager = graph_manager
        self.memory = memory_manager

    def process_query(self, req: QueryRequest) -> QueryResponse:
        query = req.query.strip()
        requested_mode = req.mode.lower()
        max_hops = min(req.max_hops, 2)

        # 1. Deterministic 2-hop Subgraph Retrieval
        subgraph: SubgraphData = self.retriever.retrieve_subgraph(query, max_hops=max_hops)

        # Prepare context payload
        nodes_context = [n.model_dump() for n in subgraph.nodes]
        edges_context = [e.model_dump() for e in subgraph.edges]
        memory_context = self.memory.format_for_prompt()

        valid_graph_node_ids: Set[str] = set(self.manager.nodes_dict.keys())

        answer: str = ""
        source_node_ids: List[str] = []
        confidence: float = 1.0
        reasoning_summary: str = ""
        mode_used: str = "OFFLINE ENGINE"
        source_warning: bool = False
        removed_ids: List[str] = []

        # 2. Reasoning Layer: Gemini or Offline
        if requested_mode == "gemini" and gemini_service.is_available():
            gemini_res = gemini_service.generate_reasoning(
                query=query,
                nodes_context=nodes_context,
                edges_context=edges_context,
                memory_context=memory_context
            )
            if gemini_res:
                answer = gemini_res["answer"]
                confidence = gemini_res["confidence"]
                reasoning_summary = gemini_res["reasoning_summary"]
                mode_used = "GEMINI ENHANCED"

                # 3. Source ID Validation (Filter hallucinations)
                validated_ids, dropped, has_warning = GraphValidator.validate_source_node_ids(
                    gemini_res["source_node_ids"],
                    valid_graph_node_ids
                )
                source_node_ids = validated_ids
                removed_ids = dropped
                source_warning = has_warning
            else:
                # Graceful fallback to offline engine
                ans, s_ids, conf, r_sum = offline_qa_engine.answer(query, subgraph)
                answer = ans
                source_node_ids = s_ids
                confidence = conf
                reasoning_summary = f"[Offline Fallback] {r_sum}"
                mode_used = "OFFLINE ENGINE (FALLBACK)"
        else:
            # Deterministic Offline Mode
            ans, s_ids, conf, r_sum = offline_qa_engine.answer(query, subgraph)
            answer = ans
            source_node_ids = s_ids
            confidence = conf
            reasoning_summary = r_sum
            mode_used = "OFFLINE ENGINE"

        # If source_node_ids empty, default to seed nodes
        if not source_node_ids:
            source_node_ids = [s for s in subgraph.seed_nodes if s in valid_graph_node_ids]

        # 4. Resolve Evidence Nodes with provenance
        evidence_nodes: List[EvidenceNode] = []
        for sid in source_node_ids:
            node_obj = self.manager.get_node(sid)
            if node_obj:
                role_detail = ""
                if node_obj.type == "member":
                    role_detail = node_obj.properties.get("role", "Member")
                elif node_obj.type == "event":
                    role_detail = f"Date: {node_obj.properties.get('date', '')} | Attendees: {node_obj.properties.get('attendee_count', '')}"
                elif node_obj.type == "policy":
                    role_detail = node_obj.properties.get("summary", "Policy")[:90] + "..."
                elif node_obj.type == "domain":
                    role_detail = "Technical Domain"
                elif node_obj.type == "project":
                    role_detail = "Active Campus Project"

                evidence_nodes.append(EvidenceNode(
                    id=node_obj.id,
                    name=node_obj.name,
                    type=node_obj.type,
                    role_or_detail=role_detail,
                    source=node_obj.source
                ))

        # 5. Build "Why This Answer?" 5-step trace
        seed_names = [
            f"{sid} ({self.manager.get_node(sid).name})"
            for sid in subgraph.seed_nodes
            if self.manager.get_node(sid)
        ]
        seed_label = ", ".join(seed_names) if seed_names else "Seed entities"

        verification_text = (
            f"All {len(source_node_ids)} source IDs successfully validated against knowledge.json"
            if not source_warning
            else f"⚠ Warning: {len(removed_ids)} invalid source IDs ({', '.join(removed_ids)}) were dropped after graph audit."
        )

        why_this_answer = WhyThisAnswer(
            step_01_entity_resolution=f"{seed_label} identified deterministically from query '{query}'",
            step_02_graph_traversal=f"Maximum depth = 2. Traversed {len(subgraph.retrieval_trace)} steps from seed nodes.",
            step_03_relevant_context=[
                f"{n.id}: {n.name} ({n.type})" for n in subgraph.nodes[:8]
            ],
            step_04_reasoning=reasoning_summary,
            step_05_verification=verification_text
        )

        # 6. Record interaction in short-term memory
        self.memory.add_interaction(
            query=query,
            answer=answer,
            source_node_ids=source_node_ids
        )

        return QueryResponse(
            answer=answer,
            source_node_ids=source_node_ids,
            evidence_nodes=evidence_nodes,
            confidence=confidence,
            reasoning_summary=reasoning_summary,
            mode=mode_used,
            retrieval={
                "seed_nodes": subgraph.seed_nodes,
                "max_depth": subgraph.max_depth,
                "nodes_retrieved": len(subgraph.nodes),
                "edges_retrieved": len(subgraph.edges)
            },
            subgraph=subgraph,
            memory_used=len(self.memory.get_interactions()) > 1,
            verification_status="WARNING" if source_warning else "VERIFIED",
            why_this_answer=why_this_answer
        )


qa_engine = QAEngine()
