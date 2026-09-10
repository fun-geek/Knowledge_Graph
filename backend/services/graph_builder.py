"""
graph_builder.py - NetworkX Knowledge Graph Manager
===================================================
Constructs, loads, and manages the in-memory NetworkX DiGraph
from knowledge.json. Provides fast lookups, graph queries, and serializations.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional
import networkx as nx

from backend.models.graph import Edge, KnowledgeGraphData, Node


class GraphManager:
    def __init__(self, knowledge_path: str = "knowledge.json"):
        self.knowledge_path = knowledge_path
        self.graph: nx.DiGraph = nx.DiGraph()
        self.nodes_dict: Dict[str, Node] = {}
        self.edges_list: List[Edge] = []
        self.metadata: Dict[str, Any] = {}
        self.load_graph()

    def load_graph(self) -> None:
        if not os.path.exists(self.knowledge_path):
            from build_graph import build_knowledge_graph
            build_knowledge_graph(output_file=self.knowledge_path)

        with open(self.knowledge_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.graph.clear()
        self.nodes_dict.clear()
        self.edges_list.clear()
        self.metadata = data.get("metadata", {})

        # Ingest nodes into NetworkX DiGraph
        for n_raw in data["nodes"]:
            node = Node(**n_raw)
            self.nodes_dict[node.id] = node
            self.graph.add_node(
                node.id,
                name=node.name,
                type=node.type,
                properties=node.properties,
                source=node.source
            )

        # Ingest edges into NetworkX DiGraph
        for e_raw in data["edges"]:
            edge = Edge(**e_raw)
            self.edges_list.append(edge)
            self.graph.add_edge(
                edge.source,
                edge.target,
                id=edge.id,
                relation=edge.relation,
                source_file=edge.source_file
            )

    def reload(self) -> None:
        from build_graph import build_knowledge_graph
        build_knowledge_graph(output_file=self.knowledge_path)
        self.load_graph()

    def get_full_graph_data(self) -> KnowledgeGraphData:
        return KnowledgeGraphData(
            nodes=list(self.nodes_dict.values()),
            edges=self.edges_list,
            metadata=self.metadata
        )

    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes_dict.get(node_id)

    def get_neighbors(self, node_id: str) -> List[Dict[str, Any]]:
        if node_id not in self.graph:
            return []
        neighbors = []
        for neighbor_id in self.graph.neighbors(node_id):
            edge_data = self.graph.get_edge_data(node_id, neighbor_id)
            neighbor_node = self.nodes_dict.get(neighbor_id)
            if neighbor_node:
                neighbors.append({
                    "neighbor_id": neighbor_id,
                    "neighbor_name": neighbor_node.name,
                    "neighbor_type": neighbor_node.type,
                    "relation": edge_data.get("relation"),
                    "edge_id": edge_data.get("id"),
                    "source_file": edge_data.get("source_file")
                })
        return neighbors


# Singleton instance for application-wide sharing
graph_manager = GraphManager()
