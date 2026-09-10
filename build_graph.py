"""
build_graph.py - Knowledge Graph Ingestion & Builder
====================================================
Constructs a validated, bidirectional, provenance-backed Knowledge Graph
from members.json, events.csv, and policies.txt.
Serializes to knowledge.json for use by NetworkX and FastAPI services.
"""

from __future__ import annotations

import csv
import json
import os
import re
from typing import Any, Dict, List, Set


DOMAIN_MAPPING = {
    "AI/ML": "D_AI_ML",
    "Cloud": "D_CLOUD",
    "Web Dev": "D_WEB_DEV",
    "Cybersecurity": "D_CYBERSECURITY",
    "Robotics": "D_ROBOTICS",
    "IoT": "D_IOT",
    "Data Science": "D_DATA_SCIENCE",
    "Budget & Finance": "D_BUDGET_FINANCE",
    "Governance": "D_GOVERNANCE",
    "DevOps": "D_DEVOPS"
}

PROJECT_DOMAIN_MAPPING = {
    "P_CAMPUS_AI_LAB_SETUP": "D_AI_ML",
    "P_CLOUD_CREDITS_PROGRAM": "D_CLOUD",
    "P_STUDENT_PORTAL_REVAMP": "D_WEB_DEV",
    "P_SECURITY_AUDIT_DRIVE": "D_CYBERSECURITY",
    "P_NLP_STUDY_GROUP": "D_AI_ML",
    "P_KAGGLE_BOOTCAMP": "D_DATA_SCIENCE",
    "P_K8S_WORKSHOP_SERIES": "D_DEVOPS",
    "P_HACKATHON_2026": "D_WEB_DEV",
    "P_ANNUAL_BUDGET_REVIEW": "D_BUDGET_FINANCE",
    "P_CTF_CLUB": "D_CYBERSECURITY",
    "P_ROBOTICS_LAB_ACCESS_TIERS": "D_ROBOTICS",
    "P_IOT_SENSOR_KITS": "D_IOT",
    "P_SPEAKER_SERIES": "D_AI_ML",
    "P_EVENT_APPROVAL_WORKFLOW_REVAMP": "D_GOVERNANCE"
}

EVENT_PROJECT_MAPPING = {
    "E005": "P_KAGGLE_BOOTCAMP",
    "E006": "P_K8S_WORKSHOP_SERIES",
    "E009": "P_IOT_SENSOR_KITS",
    "E010": "P_CTF_CLUB",
    "E011": "P_NLP_STUDY_GROUP",
    "E014": "P_ANNUAL_BUDGET_REVIEW",
    "E015": "P_HACKATHON_2026",
    "E016": "P_CLOUD_CREDITS_PROGRAM",
    "E018": "P_SECURITY_AUDIT_DRIVE",
    "E020": "P_SPEAKER_SERIES",
    "E027": "P_EVENT_APPROVAL_WORKFLOW_REVAMP",
    "E028": "P_STUDENT_PORTAL_REVAMP",
    "E029": "P_CTF_CLUB",
    "E030": "P_K8S_WORKSHOP_SERIES",
    "E033": "P_ANNUAL_BUDGET_REVIEW",
    "E034": "P_HACKATHON_2026",
    "E035": "P_ROBOTICS_LAB_ACCESS_TIERS"
}


def slugify_project(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", name.strip()).upper().strip("_")
    return f"P_{cleaned}"


def build_knowledge_graph(
    data_dir: str = "data",
    output_file: str = "knowledge.json"
) -> Dict[str, Any]:
    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, Any]] = []
    edge_ids: Set[str] = set()

    def add_edge(source: str, target: str, relation: str, source_file: str):
        edge_id = f"EDGE_{source}_{relation}_{target}"
        if edge_id in edge_ids:
            return
        edge_ids.add(edge_id)
        edges.append({
            "id": edge_id,
            "source": source,
            "target": target,
            "relation": relation,
            "source_file": source_file
        })

    def add_bidirectional_edge(
        src: str,
        tgt: str,
        fwd_rel: str,
        rev_rel: str,
        source_file: str
    ):
        add_edge(src, tgt, fwd_rel, source_file)
        add_edge(tgt, src, rev_rel, source_file)

    # 1. DOMAINS (10 standard domains)
    for dom_name, dom_id in DOMAIN_MAPPING.items():
        nodes[dom_id] = {
            "id": dom_id,
            "type": "domain",
            "name": dom_name,
            "properties": {
                "category": "Technical & Operational Domain",
                "normalized_id": dom_id
            },
            "source": "members.json"
        }

    # 2. MEMBERS
    members_path = os.path.join(data_dir, "members.json")
    with open(members_path, "r", encoding="utf-8") as f:
        members_data = json.load(f)

    email_to_member_id: Dict[str, str] = {}
    for m in members_data:
        m_id = m["id"]
        email_to_member_id[m["email"].lower()] = m_id
        nodes[m_id] = {
            "id": m_id,
            "type": "member",
            "name": m["name"],
            "properties": {
                "email": m["email"],
                "role": m["role"],
                "domains": m.get("domains", []),
                "active_projects": m.get("active_projects", [])
            },
            "source": "members.json"
        }

        # Member <-> Domain edges
        for d in m.get("domains", []):
            d_id = DOMAIN_MAPPING.get(d)
            if d_id:
                add_bidirectional_edge(m_id, d_id, "MEMBER_OF", "HAS_MEMBER", "members.json")

        # Projects & Member <-> Project edges
        for p_name in m.get("active_projects", []):
            p_id = slugify_project(p_name)
            if p_id not in nodes:
                nodes[p_id] = {
                    "id": p_id,
                    "type": "project",
                    "name": p_name,
                    "properties": {
                        "status": "Active",
                        "normalized_id": p_id
                    },
                    "source": "members.json"
                }
            add_bidirectional_edge(m_id, p_id, "WORKS_ON", "OWNED_BY", "members.json")

    # Project <-> Domain edges
    for p_id, d_id in PROJECT_DOMAIN_MAPPING.items():
        if p_id in nodes and d_id in nodes:
            add_bidirectional_edge(p_id, d_id, "BELONGS_TO", "HAS_PROJECT", "members.json")

    # 3. EVENTS
    events_path = os.path.join(data_dir, "events.csv")
    with open(events_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            e_id = row["event_id"].strip()
            e_name = row["event_name"].strip()
            e_date = row["date"].strip()
            e_domain = row["domain"].strip()
            e_email = row["lead_email"].strip().lower()
            e_attendees = int(row["attendee_count"].strip())

            nodes[e_id] = {
                "id": e_id,
                "type": "event",
                "name": e_name,
                "properties": {
                    "date": e_date,
                    "domain": e_domain,
                    "lead_email": e_email,
                    "attendee_count": e_attendees
                },
                "source": "events.csv"
            }

            # Event <-> Member (Lead)
            lead_m_id = email_to_member_id.get(e_email)
            if lead_m_id:
                add_bidirectional_edge(lead_m_id, e_id, "LEADS", "LED_BY", "events.csv")

            # Event <-> Domain
            d_id = DOMAIN_MAPPING.get(e_domain)
            if d_id:
                add_bidirectional_edge(e_id, d_id, "BELONGS_TO", "HAS_EVENT", "events.csv")

            # Event <-> Project
            if e_id in EVENT_PROJECT_MAPPING:
                p_id = EVENT_PROJECT_MAPPING[e_id]
                if p_id in nodes:
                    add_bidirectional_edge(e_id, p_id, "PART_OF_PROJECT", "HAS_EVENT", "events.csv")

    # 4. POLICIES (POL001 - POL005 from policies.txt)
    policies_data = [
        {
            "id": "POL001",
            "name": "Venue Booking Rules",
            "section": 1,
            "properties": {
                "manager": "Neha Bhatt",
                "manager_id": "M009",
                "final_approver_auditorium": "Ananya Roy",
                "final_approver_id": "M001",
                "advance_notice_days": 10,
                "auditorium_capacity_threshold": 150,
                "priority_domains": ["Web Dev", "AI/ML"],
                "summary": "Auditorium booking (150+) requires sign-off from Committee Chair Ananya Roy; smaller rooms booked directly with domain leads. Prioritizes Web Dev and AI/ML events like Hackathon 2026."
            },
            "manager_id": "M009",
            "approver_id": "M001",
            "applies_to": ["D_WEB_DEV", "D_AI_ML"],
            "mentions_events": ["E015"]
        },
        {
            "id": "POL002",
            "name": "Budget Allocation Limits",
            "section": 2,
            "properties": {
                "manager": "Arjun Kapoor",
                "manager_id": "M006",
                "overspend_approver": "Ananya Roy",
                "approver_id": "M001",
                "funding_cap_inr": 25000,
                "high_budget_domains": ["AI/ML", "Cloud"],
                "summary": "Treasurer Arjun Kapoor caps individual event funding at INR 25,000. AI/ML and Cloud receive largest shares. Overspend must be justified in writing to Arjun Kapoor and countersigned by Ananya Roy."
            },
            "manager_id": "M006",
            "approver_id": "M001",
            "applies_to": ["D_BUDGET_FINANCE", "D_AI_ML", "D_CLOUD", "D_WEB_DEV", "D_CYBERSECURITY", "D_ROBOTICS", "D_IOT"],
            "mentions_events": ["E014"]
        },
        {
            "id": "POL003",
            "name": "Lab Hardware Access Tiers",
            "section": 3,
            "properties": {
                "manager": "Karan Malhotra",
                "manager_id": "M008",
                "joint_approver_tier3": "Sneha Iyer",
                "joint_approver_id": "M003",
                "tiers": [
                    "Tier 1: General Access (Sensor kits & prototyping boards)",
                    "Tier 2: Supervised Access (Robotics arms & 3D printers - Karan Malhotra approval)",
                    "Tier 3: Restricted Access (GPU clusters - Joint approval: Karan Malhotra & Sneha Iyer)"
                ],
                "summary": "Lab Coordinator Karan Malhotra manages 3 tiers. Tier 2 requires Karan Malhotra approval. Tier 3 (Restricted Access) GPU clusters require joint approval from Karan Malhotra and AI/ML Lead Sneha Iyer."
            },
            "manager_id": "M008",
            "joint_approver_id": "M003",
            "applies_to": ["D_ROBOTICS", "D_IOT", "D_AI_ML"],
            "mentions_projects": ["P_ROBOTICS_LAB_ACCESS_TIERS", "P_CAMPUS_AI_LAB_SETUP"]
        },
        {
            "id": "POL004",
            "name": "Event Approval Workflow",
            "section": 4,
            "properties": {
                "manager": "Aditya Singh",
                "manager_id": "M010",
                "large_event_threshold": 100,
                "large_event_approver": "Ananya Roy",
                "approver_id": "M001",
                "domain_reviewers": {
                    "Cloud": "Vikram Nair (M004)",
                    "Cybersecurity": "Divya Menon (M007)",
                    "Web Dev": "Priya Desai (M005)"
                },
                "summary": "Every event verified by Approvals Officer Aditya Singh. Cloud reviewed by Vikram Nair, Cybersecurity by Divya Menon, Web Dev by Priya Desai. Final approval for events exceeding 100 expected attendees rests with Committee Chair Ananya Roy."
            },
            "manager_id": "M010",
            "approver_id": "M001",
            "reviewers": ["M004", "M007", "M005"],
            "applies_to": ["D_GOVERNANCE"],
            "mentions_events": ["E015", "E020", "E034"]
        },
        {
            "id": "POL005",
            "name": "Cross-Domain Collaboration Guidelines",
            "section": 5,
            "properties": {
                "mediator": "Rohan Mehta",
                "mediator_id": "M002",
                "audit_officers": ["Neha Bhatt (M009)", "Aditya Singh (M010)"],
                "summary": "When events span multiple domains, leads of both domains must co-sign. Vice Chair Rohan Mehta mediates disputes over shared resources. Jointly logged by Neha Bhatt and Aditya Singh."
            },
            "mediator_id": "M002",
            "audit_officers": ["M009", "M010"],
            "applies_to": ["D_GOVERNANCE", "D_AI_ML", "D_CLOUD"]
        }
    ]

    for pol in policies_data:
        pol_id = pol["id"]
        nodes[pol_id] = {
            "id": pol_id,
            "type": "policy",
            "name": pol["name"],
            "properties": pol["properties"],
            "source": "policies.txt"
        }

        # Manager
        if "manager_id" in pol:
            add_bidirectional_edge(pol_id, pol["manager_id"], "MANAGED_BY", "MANAGES", "policies.txt")

        # Approver
        if "approver_id" in pol:
            add_bidirectional_edge(pol_id, pol["approver_id"], "FINAL_APPROVER", "FINAL_APPROVER_OF", "policies.txt")

        # Joint Approver
        if "joint_approver_id" in pol:
            add_bidirectional_edge(pol_id, pol["joint_approver_id"], "JOINT_APPROVER", "JOINT_APPROVER_OF", "policies.txt")

        # Mediator
        if "mediator_id" in pol:
            add_bidirectional_edge(pol_id, pol["mediator_id"], "MEDIATED_BY", "MEDIATES", "policies.txt")

        # Audit Officers
        for audit_m_id in pol.get("audit_officers", []):
            add_bidirectional_edge(pol_id, audit_m_id, "AUDITED_BY", "AUDITS", "policies.txt")

        # Technical Reviewers
        for rev_m_id in pol.get("reviewers", []):
            add_bidirectional_edge(pol_id, rev_m_id, "TECHNICAL_REVIEWER", "REVIEWS_FOR", "policies.txt")

        # Applies to domains
        for d_id in pol.get("applies_to", []):
            if d_id in nodes:
                add_bidirectional_edge(pol_id, d_id, "APPLIES_TO", "HAS_POLICY", "policies.txt")

        # Mentions events
        for e_id in pol.get("mentions_events", []):
            if e_id in nodes:
                add_bidirectional_edge(pol_id, e_id, "MENTIONS", "GOVERNED_BY", "policies.txt")

        # Mentions projects
        for p_id in pol.get("mentions_projects", []):
            if p_id in nodes:
                add_bidirectional_edge(pol_id, p_id, "MENTIONS", "GOVERNED_BY", "policies.txt")

    graph_payload = {
        "nodes": list(nodes.values()),
        "edges": edges,
        "metadata": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "members_count": sum(1 for n in nodes.values() if n["type"] == "member"),
            "events_count": sum(1 for n in nodes.values() if n["type"] == "event"),
            "domains_count": sum(1 for n in nodes.values() if n["type"] == "domain"),
            "projects_count": sum(1 for n in nodes.values() if n["type"] == "project"),
            "policies_count": sum(1 for n in nodes.values() if n["type"] == "policy"),
            "generated_at": "2026-09-09T23:15:00Z"
        }
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(graph_payload, f, indent=2)

    print(f"[+] Generated {output_file} successfully:")
    print(f"    Total Nodes: {len(nodes)}")
    print(f"    Members:  {graph_payload['metadata']['members_count']}")
    print(f"    Events:   {graph_payload['metadata']['events_count']}")
    print(f"    Domains:  {graph_payload['metadata']['domains_count']}")
    print(f"    Projects: {graph_payload['metadata']['projects_count']}")
    print(f"    Policies: {graph_payload['metadata']['policies_count']}")
    print(f"    Total Edges: {len(edges)}")

    return graph_payload


if __name__ == "__main__":
    build_knowledge_graph()
