"""
validator.py - Graph Integrity & Source ID Validation
=====================================================
Audits the knowledge graph for:
- Unique node & edge IDs
- Broken edge references (source/target missing)
- Orphan nodes (degree == 0)
- Invalid node types & missing required properties
- Reverse-edge consistency (bidirectional integrity)
- Source verification for LLM outputs
"""

from __future__ import annotations

from typing import Any, Dict, List, Set, Tuple
import networkx as nx

from backend.models.graph import GraphHealth

VALID_NODE_TYPES = {"member", "event", "domain", "project", "policy"}


class GraphValidator:
    @staticmethod
    def audit_graph(graph_data: Dict[str, Any], nx_graph: nx.DiGraph) -> GraphHealth:
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        details: List[str] = []
        node_ids: Set[str] = set()
        duplicate_nodes = 0
        missing_props = 0
        invalid_types = 0

        type_dist: Dict[str, int] = {}

        for n in nodes:
            n_id = n.get("id")
            n_type = n.get("type")
            n_name = n.get("name")
            n_source = n.get("source")

            if not n_id or not n_name or not n_source:
                missing_props += 1
                details.append(f"Node missing required property: {n}")

            if n_id in node_ids:
                duplicate_nodes += 1
                details.append(f"Duplicate node ID detected: {n_id}")
            node_ids.add(n_id)

            if n_type not in VALID_NODE_TYPES:
                invalid_types += 1
                details.append(f"Invalid node type '{n_type}' on node {n_id}")
            else:
                type_dist[n_type] = type_dist.get(n_type, 0) + 1

        # Check edge IDs and broken references
        edge_ids: Set[str] = set()
        broken_edges = 0
        edge_pairs: Set[Tuple[str, str]] = set()

        for e in edges:
            e_id = e.get("id")
            src = e.get("source")
            tgt = e.get("target")

            if e_id in edge_ids:
                details.append(f"Duplicate edge ID: {e_id}")
            edge_ids.add(e_id)

            if src not in node_ids or tgt not in node_ids:
                broken_edges += 1
                details.append(f"Broken edge reference in edge {e_id}: {src} -> {tgt}")

            edge_pairs.add((src, tgt))

        # Check reverse-edge consistency (bidirectional relationships)
        reverse_edge_failures = 0
        for src, tgt in edge_pairs:
            if (tgt, src) not in edge_pairs:
                reverse_edge_failures += 1
                details.append(f"Missing reverse edge for {src} -> {tgt}")

        # Check orphan nodes (nodes with 0 incoming AND 0 outgoing edges)
        orphans = 0
        for n_id in node_ids:
            in_deg = nx_graph.in_degree(n_id) if n_id in nx_graph else 0
            out_deg = nx_graph.out_degree(n_id) if n_id in nx_graph else 0
            if in_deg == 0 and out_deg == 0:
                orphans += 1
                details.append(f"Orphan node detected: {n_id}")

        is_healthy = (
            duplicate_nodes == 0
            and broken_edges == 0
            and orphans == 0
            and reverse_edge_failures == 0
            and invalid_types == 0
            and missing_props == 0
        )

        status_msg = "HEALTHY" if is_healthy else "ISSUES_DETECTED"

        return GraphHealth(
            status=status_msg,
            total_nodes=len(node_ids),
            total_edges=len(edges),
            orphans=orphans,
            broken_references=broken_edges,
            duplicate_ids=duplicate_nodes,
            reverse_edge_failures=reverse_edge_failures,
            node_types_distribution=type_dist,
            is_healthy=is_healthy,
            details=details
        )

    @staticmethod
    def validate_source_node_ids(
        proposed_ids: List[str],
        valid_node_ids: Set[str]
    ) -> Tuple[List[str], List[str], bool]:
        """
        Validates a list of source node IDs returned by Gemini against valid graph nodes.
        Returns:
            - validated_ids: list of IDs that actually exist in knowledge.json
            - removed_ids: list of invalid/hallucinated IDs that were dropped
            - has_warning: True if any IDs were invalid
        """
        validated_ids = []
        removed_ids = []

        for nid in proposed_ids:
            cleaned_id = nid.strip()
            if cleaned_id in valid_node_ids:
                if cleaned_id not in validated_ids:
                    validated_ids.append(cleaned_id)
            else:
                removed_ids.append(cleaned_id)

        has_warning = len(removed_ids) > 0
        return validated_ids, removed_ids, has_warning
