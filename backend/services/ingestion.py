"""
ingestion.py - Raw Campus Data Ingestion Service
================================================
Reads and standardizes raw files:
- members.json (Committee members, roles, domain expertise, active projects)
- events.csv (Workshops, hackathons, seminars, attendance, lead emails)
- policies.txt (Committee operating policies, approval tiers, budget caps)
"""

from __future__ import annotations

import csv
import json
import os
from typing import Any, Dict, List, Tuple


class IngestionService:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir

    def verify_files_exist(self) -> Tuple[bool, List[str]]:
        required = ["members.json", "events.csv", "policies.txt"]
        missing = []
        for fn in required:
            fp = os.path.join(self.data_dir, fn)
            if not os.path.isfile(fp):
                missing.append(fn)
        return len(missing) == 0, missing

    def load_members(self) -> List[Dict[str, Any]]:
        path = os.path.join(self.data_dir, "members.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_events(self) -> List[Dict[str, Any]]:
        path = os.path.join(self.data_dir, "events.csv")
        records = []
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append({
                    "event_id": row["event_id"].strip(),
                    "event_name": row["event_name"].strip(),
                    "date": row["date"].strip(),
                    "domain": row["domain"].strip(),
                    "lead_email": row["lead_email"].strip().lower(),
                    "attendee_count": int(row["attendee_count"].strip())
                })
        return records

    def load_policies_raw(self) -> str:
        path = os.path.join(self.data_dir, "policies.txt")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
