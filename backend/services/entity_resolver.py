"""
entity_resolver.py - Deterministic Campus Entity Resolution
============================================================
Resolves user natural-language queries into canonical graph node IDs
(M001-M010, E001-E035, D_*, P_*, POL001-POL005) using deterministic
token normalization, keyword matching, role dictionaries, and alias tables.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Set, Tuple


def normalize_text(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


class EntityResolver:
    def __init__(self):
        # Role to Member ID mappings
        self.role_map: Dict[str, str] = {
            "committee chair": "M001",
            "chair": "M001",
            "vice chair": "M002",
            "ai ml lead": "M003",
            "ai lead": "M003",
            "ml lead": "M003",
            "cloud lead": "M004",
            "web dev lead": "M005",
            "web lead": "M005",
            "treasurer": "M006",
            "finance lead": "M006",
            "cybersecurity lead": "M007",
            "security lead": "M007",
            "lab coordinator": "M008",
            "lab manager": "M008",
            "events coordinator": "M009",
            "event coordinator": "M009",
            "approvals officer": "M010",
            "approval officer": "M010"
        }

        # Name to Member ID mappings
        self.member_names: Dict[str, str] = {
            "ananya roy": "M001",
            "ananya": "M001",
            "rohan mehta": "M002",
            "rohan": "M002",
            "sneha iyer": "M003",
            "sneha": "M003",
            "vikram nair": "M004",
            "vikram": "M004",
            "priya desai": "M005",
            "priya": "M005",
            "arjun kapoor": "M006",
            "arjun": "M006",
            "divya menon": "M007",
            "divya": "M007",
            "karan malhotra": "M008",
            "karan": "M008",
            "neha bhatt": "M009",
            "neha": "M009",
            "aditya singh": "M010",
            "aditya": "M010"
        }

        # Domain keywords to Domain ID mappings
        self.domain_keywords: Dict[str, str] = {
            "ai ml": "D_AI_ML",
            "ai": "D_AI_ML",
            "ml": "D_AI_ML",
            "machine learning": "D_AI_ML",
            "artificial intelligence": "D_AI_ML",
            "deep learning": "D_AI_ML",
            "cloud": "D_CLOUD",
            "aws": "D_CLOUD",
            "cloud computing": "D_CLOUD",
            "web dev": "D_WEB_DEV",
            "web": "D_WEB_DEV",
            "frontend": "D_WEB_DEV",
            "full stack": "D_WEB_DEV",
            "cybersecurity": "D_CYBERSECURITY",
            "security": "D_CYBERSECURITY",
            "ethical hacking": "D_CYBERSECURITY",
            "ctf": "D_CYBERSECURITY",
            "robotics": "D_ROBOTICS",
            "iot": "D_IOT",
            "internet of things": "D_IOT",
            "sensor": "D_IOT",
            "data science": "D_DATA_SCIENCE",
            "budget": "D_BUDGET_FINANCE",
            "finance": "D_BUDGET_FINANCE",
            "governance": "D_GOVERNANCE",
            "devops": "D_DEVOPS",
            "kubernetes": "D_DEVOPS",
            "k8s": "D_DEVOPS",
            "docker": "D_DEVOPS",
            "ci cd": "D_DEVOPS"
        }

        # Policy concepts and triggers
        self.policy_triggers: Dict[str, str] = {
            "gpu": "POL003",
            "gpu access": "POL003",
            "restricted gpu": "POL003",
            "tier 3": "POL003",
            "tier 2": "POL003",
            "tier 1": "POL003",
            "hardware access": "POL003",
            "lab hardware": "POL003",
            "robotics lab access": "POL003",
            "3d printer": "POL003",
            "venue booking": "POL001",
            "auditorium": "POL001",
            "seminar hall": "POL001",
            "venue": "POL001",
            "budget allocation": "POL002",
            "budget cap": "POL002",
            "overspend": "POL002",
            "25000": "POL002",
            "25 000": "POL002",
            "inr 25 000": "POL002",
            "event approval": "POL004",
            "100 attendees": "POL004",
            "100": "POL004",
            "large event": "POL004",
            "technical review": "POL004",
            "cross domain": "POL005",
            "collaboration": "POL005",
            "dispute": "POL005",
            "shared resources": "POL005"
        }

        # Project triggers
        self.project_triggers: Dict[str, str] = {
            "nlp study group": "P_NLP_STUDY_GROUP",
            "kaggle bootcamp": "P_KAGGLE_BOOTCAMP",
            "cloud credits": "P_CLOUD_CREDITS_PROGRAM",
            "student portal": "P_STUDENT_PORTAL_REVAMP",
            "security audit": "P_SECURITY_AUDIT_DRIVE",
            "k8s workshop": "P_K8S_WORKSHOP_SERIES",
            "hackathon 2026": "P_HACKATHON_2026",
            "annual budget review": "P_ANNUAL_BUDGET_REVIEW",
            "ctf club": "P_CTF_CLUB",
            "robotics lab access tiers": "P_ROBOTICS_LAB_ACCESS_TIERS",
            "iot sensor kits": "P_IOT_SENSOR_KITS",
            "speaker series": "P_SPEAKER_SERIES",
            "event approval workflow": "P_EVENT_APPROVAL_WORKFLOW_REVAMP",
            "campus ai lab": "P_CAMPUS_AI_LAB_SETUP"
        }

    def resolve(self, query: str) -> Tuple[List[str], Dict[str, str]]:
        """
        Resolves query into a prioritized list of seed node IDs.
        Returns:
            - resolved_ids: list of matched node IDs (deduplicated)
            - resolution_map: mapping from matched phrase to node ID
        """
        norm_query = normalize_text(query)
        resolved_ids: List[str] = []
        resolution_map: Dict[str, str] = {}

        def match_and_add(candidate_id: str, matched_key: str):
            if candidate_id not in resolved_ids:
                resolved_ids.append(candidate_id)
                resolution_map[matched_key] = candidate_id

        # 0. Direct ID patterns (e.g. M003, E015, POL003, D_AI_ML, P_HACKATHON_2026)
        raw_upper = query.upper()
        for pattern in [r"\bM0[0-9]{2}\b", r"\bE0[0-9]{2}\b", r"\bPOL00[1-5]\b", r"\bD_[A-Z_]+\b", r"\bP_[A-Z_0-9]+\b"]:
            matches = re.findall(pattern, raw_upper)
            for m in matches:
                match_and_add(m, m)

        # 1. Policy Triggers (check multi-word keys first)
        for trigger in sorted(self.policy_triggers.keys(), key=len, reverse=True):
            pattern = rf"\b{re.escape(trigger)}\b"
            if re.search(pattern, norm_query):
                match_and_add(self.policy_triggers[trigger], trigger)

        # 2. Roles
        for role in sorted(self.role_map.keys(), key=len, reverse=True):
            pattern = rf"\b{re.escape(role)}\b"
            if re.search(pattern, norm_query):
                match_and_add(self.role_map[role], role)

        # 3. Member Names
        for name in sorted(self.member_names.keys(), key=len, reverse=True):
            pattern = rf"\b{re.escape(name)}\b"
            if re.search(pattern, norm_query):
                match_and_add(self.member_names[name], name)

        # 4. Projects
        for proj in sorted(self.project_triggers.keys(), key=len, reverse=True):
            pattern = rf"\b{re.escape(proj)}\b"
            if re.search(pattern, norm_query):
                match_and_add(self.project_triggers[proj], proj)

        # 5. Domains
        for dom in sorted(self.domain_keywords.keys(), key=len, reverse=True):
            pattern = rf"\b{re.escape(dom)}\b"
            if re.search(pattern, norm_query):
                match_and_add(self.domain_keywords[dom], dom)

        # Fallback if no seed nodes resolved: default to D_AI_ML or M001
        if not resolved_ids:
            # Check for generic "events", "policies", "members"
            if "event" in norm_query:
                match_and_add("E015", "hackathon event")
            elif "policy" in norm_query:
                match_and_add("POL004", "event approval policy")
            else:
                match_and_add("M001", "campus chair")

        return resolved_ids, resolution_map


entity_resolver = EntityResolver()
