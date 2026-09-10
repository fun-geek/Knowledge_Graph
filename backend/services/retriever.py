"""
retriever.py - Strict 2-Hop Knowledge Graph Traversal Engine
============================================================
Enforces deterministic graph retrieval:
1. Resolves seed nodes from query via EntityResolver
2. Traverses exactly up to max_hops = 2 (Seed -> 1-Hop -> 2-Hop)
3. Caches visited nodes and induced edges
4. Produces a full step-by-step retrieval trace
"""

from __future__ import annotations

from typing import Any, Dict, List, Set, Tuple
import networkx as nx

from backend.models.graph import Edge, Node, RetrievalTraceStep, SubgraphData
from backend.services.entity_resolver import entity_resolver
from backend.services.graph_builder import graph_manager


class GraphRetriever:
    def __init__(self, manager=graph_manager):
        self.manager = manager

    def retrieve_subgraph(self, query: str, max_hops: int = 2) -> SubgraphData:
        # Enforce strict maximum depth of 2 hops
        enforced_max_hops = min(max_hops, 2)

        # 1. Resolve seed nodes
        seed_nodes, _ = entity_resolver.resolve(query)
        # Filter only existing nodes
        valid_seed_nodes = [s for s in seed_nodes if s in self.manager.nodes_dict]

        if not valid_seed_nodes:
            # Fallback to default committee chair if nothing resolves
            valid_seed_nodes = ["M001"]

        # Keep primary seeds (top 2 to keep subgraph focused and high-signal)
        primary_seeds = valid_seed_nodes[:2]

        visited_nodes: Set[str] = set()
        node_depths: Dict[str, int] = {}
        trace: List[RetrievalTraceStep] = []
        retrieved_edges: List[Edge] = []
        seen_edge_ids: Set[str] = set()

        # Queue of (node_id, current_depth, parent_id, relation_from_parent)
        # Step 1: Initialize seed nodes at depth 0
        queue: List[Tuple[str, int, str | None, str | None]] = []
        for seed_id in primary_seeds:
            visited_nodes.add(seed_id)
            node_depths[seed_id] = 0
            node_obj = self.manager.get_node(seed_id)
            if node_obj:
                trace.append(RetrievalTraceStep(
                    node_id=seed_id,
                    node_name=node_obj.name,
                    node_type=node_obj.type,
                    depth=0,
                    relation=None,
                    parent_id=None
                ))
            queue.append((seed_id, 0, None, None))

        # BFS traversal strictly capped at enforced_max_hops (2)
        head = 0
        while head < len(queue):
            curr_id, curr_depth, _, _ = queue[head]
            head += 1

            if curr_depth >= enforced_max_hops:
                continue

            # Traverse outgoing and incoming neighbors in the NetworkX graph
            neighbors = self.manager.get_neighbors(curr_id)
            for nbr in neighbors:
                nbr_id = nbr["neighbor_id"]
                rel = nbr.get("relation", "CONNECTED_TO")

                if nbr_id not in visited_nodes:
                    visited_nodes.add(nbr_id)
                    next_depth = curr_depth + 1
                    node_depths[nbr_id] = next_depth

                    nbr_obj = self.manager.get_node(nbr_id)
                    if nbr_obj:
                        trace.append(RetrievalTraceStep(
                            node_id=nbr_id,
                            node_name=nbr_obj.name,
                            node_type=nbr_obj.type,
                            depth=next_depth,
                            relation=rel,
                            parent_id=curr_id
                        ))

                    if next_depth < enforced_max_hops:
                        queue.append((nbr_id, next_depth, curr_id, rel))

        # Collect induced edges between visited nodes
        for e in self.manager.edges_list:
            if e.source in visited_nodes and e.target in visited_nodes:
                if e.id not in seen_edge_ids:
                    seen_edge_ids.add(e.id)
                    retrieved_edges.append(e)

        # Collect node objects
        retrieved_nodes = [
            self.manager.nodes_dict[nid]
            for nid in visited_nodes
            if nid in self.manager.nodes_dict
        ]

        return SubgraphData(
            seed_nodes=primary_seeds,
            nodes=retrieved_nodes,
            edges=retrieved_edges,
            max_depth=enforced_max_hops,
            retrieval_trace=trace
        )


graph_retriever = GraphRetriever()
