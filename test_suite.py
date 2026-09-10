"""
test_suite.py - End-to-End Verification Test Suite
==================================================
Tests:
1. Graph construction & integrity (74 nodes, 346 edges, 0 orphans, 0 broken refs)
2. Entity resolution accuracy
3. Strict 2-hop traversal depth constraint (never > 2 hops)
4. Short-term memory (exactly 3 items max capacity, evicts oldest)
5. Offline QA deterministic templates & source verification
6. Source validator rejection of hallucinated IDs
"""

import unittest
from backend.services.graph_builder import graph_manager
from backend.services.entity_resolver import entity_resolver
from backend.services.retriever import graph_retriever
from backend.services.memory import MemoryManager
from backend.services.offline_qa import offline_qa_engine
from backend.services.validator import GraphValidator
from backend.models.query import QueryRequest
from backend.services.qa_engine import qa_engine


class TestCampusCollective(unittest.TestCase):
    def test_01_graph_integrity(self):
        """Verify knowledge graph has 74 nodes, valid types, and 0 orphans."""
        nodes = graph_manager.nodes_dict
        edges = graph_manager.edges_list

        self.assertEqual(len(nodes), 74, "Must have exactly 74 nodes")
        self.assertGreaterEqual(len(edges), 300, "Must have at least 300 bidirectional edges")

        type_counts = {}
        for n in nodes.values():
            type_counts[n.type] = type_counts.get(n.type, 0) + 1

        self.assertEqual(type_counts.get("member"), 10, "Must have 10 members")
        self.assertEqual(type_counts.get("event"), 35, "Must have 35 events")
        self.assertEqual(type_counts.get("domain"), 10, "Must have 10 domains")
        self.assertEqual(type_counts.get("project"), 14, "Must have 14 projects")
        self.assertEqual(type_counts.get("policy"), 5, "Must have 5 policies")

        # Verify no orphan nodes
        health = GraphValidator.audit_graph(
            {"nodes": [n.model_dump() for n in nodes.values()], "edges": [e.model_dump() for e in edges]},
            graph_manager.graph
        )
        self.assertTrue(health.is_healthy, f"Graph health audit failed: {health.details}")
        self.assertEqual(health.orphans, 0, "Must have 0 orphan nodes")
        self.assertEqual(health.broken_references, 0, "Must have 0 broken references")
        self.assertEqual(health.duplicate_ids, 0, "Must have 0 duplicate IDs")
        self.assertEqual(health.reverse_edge_failures, 0, "Must have 0 reverse edge failures")

    def test_02_entity_resolution(self):
        """Verify deterministic entity resolution for key queries."""
        # Query 1: GPU access -> POL003
        seeds, _ = entity_resolver.resolve("Who must approve restricted GPU access?")
        self.assertIn("POL003", seeds)

        # Query 2: AI/ML -> D_AI_ML or M003
        seeds, _ = entity_resolver.resolve("Who leads AI/ML events?")
        self.assertTrue("D_AI_ML" in seeds or "M003" in seeds)

        # Query 3: Cloud lead -> M004 or D_CLOUD
        seeds, _ = entity_resolver.resolve("Who is the cloud lead?")
        self.assertTrue("M004" in seeds or "D_CLOUD" in seeds)

        # Query 4: 100+ attendee approval -> POL004
        seeds, _ = entity_resolver.resolve("Who gives final approval for events above 100 attendees?")
        self.assertIn("POL004", seeds)

        # Query 5: Robotics lab access -> POL003
        seeds, _ = entity_resolver.resolve("Who manages robotics lab access?")
        self.assertTrue("POL003" in seeds or "D_ROBOTICS" in seeds)

    def test_03_strict_two_hop_traversal(self):
        """Verify retrieval never traverses beyond max_hops=2."""
        subgraph = graph_retriever.retrieve_subgraph("Who must approve restricted GPU access?", max_hops=2)
        self.assertLessEqual(subgraph.max_depth, 2)

        for step in subgraph.retrieval_trace:
            self.assertLessEqual(step.depth, 2, f"Node {step.node_id} traversed at depth {step.depth} > 2!")

        # Requesting 5 hops must still cap at 2 hops
        subgraph_capped = graph_retriever.retrieve_subgraph("cloud events", max_hops=5)
        self.assertLessEqual(subgraph_capped.max_depth, 2)
        for step in subgraph_capped.retrieval_trace:
            self.assertLessEqual(step.depth, 2)

    def test_04_short_term_memory(self):
        """Verify memory maintains exactly last 3 interactions and evicts oldest."""
        mem = MemoryManager(max_capacity=3)
        mem.add_interaction("Q1", "A1", ["M001"])
        mem.add_interaction("Q2", "A2", ["M002"])
        mem.add_interaction("Q3", "A3", ["M003"])

        status = mem.get_status()
        self.assertEqual(status["count"], 3)
        self.assertEqual(status["items"][0]["query"], "Q1")

        # 4th interaction must evict Q1
        mem.add_interaction("Q4", "A4", ["M004"])
        status4 = mem.get_status()
        self.assertEqual(status4["count"], 3)
        self.assertEqual(status4["items"][0]["query"], "Q2")
        self.assertEqual(status4["items"][2]["query"], "Q4")

        # Clear memory
        mem.clear()
        self.assertEqual(mem.get_status()["count"], 0)

    def test_05_source_id_validation(self):
        """Verify that hallucinated source IDs are purged."""
        valid_ids = set(graph_manager.nodes_dict.keys())
        proposed = ["POL003", "M008", "NON_EXISTENT_ID_999", "M003", "FAKE_ENTITY"]

        validated, dropped, has_warning = GraphValidator.validate_source_node_ids(proposed, valid_ids)

        self.assertEqual(validated, ["POL003", "M008", "M003"])
        self.assertEqual(dropped, ["NON_EXISTENT_ID_999", "FAKE_ENTITY"])
        self.assertTrue(has_warning)

    def test_06_benchmark_queries_offline_qa(self):
        """Verify all 5 benchmark questions return correct answers and verified sources."""
        # 1. GPU access
        res1 = qa_engine.process_query(QueryRequest(query="Who must approve restricted GPU access?", mode="offline"))
        self.assertIn("Karan Malhotra", res1.answer)
        self.assertIn("Sneha Iyer", res1.answer)
        self.assertIn("POL003", res1.source_node_ids)
        self.assertIn("M008", res1.source_node_ids)
        self.assertIn("M003", res1.source_node_ids)

        # 2. 100+ attendees approval
        res2 = qa_engine.process_query(QueryRequest(query="Who gives final approval for events above 100 attendees?", mode="offline"))
        self.assertIn("Ananya Roy", res2.answer)
        self.assertIn("POL004", res2.source_node_ids)
        self.assertIn("M001", res2.source_node_ids)

        # 3. Cloud lead
        res3 = qa_engine.process_query(QueryRequest(query="Who is the cloud lead?", mode="offline"))
        self.assertIn("Vikram Nair", res3.answer)
        self.assertIn("M004", res3.source_node_ids)

        # 4. AI/ML events
        res4 = qa_engine.process_query(QueryRequest(query="Who leads AI/ML events?", mode="offline"))
        self.assertIn("Sneha Iyer", res4.answer)
        self.assertIn("M003", res4.source_node_ids)

        # 5. Robotics lab access
        res5 = qa_engine.process_query(QueryRequest(query="Who manages robotics lab access?", mode="offline"))
        self.assertIn("Karan Malhotra", res5.answer)
        self.assertIn("M008", res5.source_node_ids)


if __name__ == "__main__":
    unittest.main()
