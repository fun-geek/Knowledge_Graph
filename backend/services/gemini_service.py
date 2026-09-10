"""
gemini_service.py - Google Gemini Reasoning Layer Adapter
=========================================================
Implements the reasoning layer for Campus Collective.
Grounds reasoning STRICTLY on the retrieved 2-hop subgraph and conversation memory.
Never allows Gemini to act as source of truth.
Enforces structured JSON outputs and falls back gracefully when unavailable.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

SYSTEM_INSTRUCTION = """You are the reasoning layer of Campus Collective — Knowledge Graph & AI QA Engine.
You are NOT the source of truth.
The knowledge graph is the sole source of truth.

Answer the user's question strictly and only using the supplied 2-hop knowledge graph context and conversation memory.
Never invent members, events, projects, policies, domains, relationships, dates, or numerical facts.
If the provided context is insufficient to answer the query, explicitly state that the available graph context is insufficient.

Return ONLY a valid, single JSON object with the following exact keys:
{
  "answer": "Clear, precise factual answer based strictly on the provided context.",
  "source_node_ids": ["M003", "POL003"],
  "confidence": 0.95,
  "reasoning_summary": "Brief explanation of how the graph connections lead to this answer."
}

CRITICAL RULES:
1. Every ID in 'source_node_ids' MUST correspond to an actual node supplied in the context (e.g. M001-M010, E001-E035, POL001-POL005, D_*, P_*).
2. Never invent IDs that are not present in the graph context.
3. Do not include markdown code block syntax (like ```json). Return raw JSON only.
"""


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        # Configurable model with verified modern default
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self._client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            return
        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        except Exception as e:
            print(f"[!] Warning: Could not initialize google.genai Client: {e}")
            self._client = None

    def is_available(self) -> bool:
        return bool(self.api_key and self._client is not None)

    def generate_reasoning(
        self,
        query: str,
        nodes_context: List[Dict[str, Any]],
        edges_context: List[Dict[str, Any]],
        memory_context: str
    ) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None

        # Build clean, minimal graph context
        context_payload = {
            "retrieved_nodes": [
                {
                    "id": n["id"],
                    "type": n["type"],
                    "name": n["name"],
                    "properties": n.get("properties", {}),
                    "source_file": n.get("source")
                }
                for n in nodes_context
            ],
            "retrieved_edges": [
                {
                    "source": e["source"],
                    "relation": e["relation"],
                    "target": e["target"]
                }
                for e in edges_context
            ]
        }

        user_content = f"""USER QUERY:
{query}

CONVERSATION MEMORY (Last 3 interactions):
{memory_context}

RETRIEVED 2-HOP GRAPH CONTEXT:
{json.dumps(context_payload, indent=2)}

Synthesize the answer based ONLY on the above graph facts. Return JSON matching the required schema."""

        try:
            from google.genai import types

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )

            raw_text = response.text.strip()
            # Clean markdown if present
            cleaned_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            cleaned_text = re.sub(r"\s*```$", "", cleaned_text)

            parsed = json.loads(cleaned_text)

            # Validate basic schema
            if "answer" in parsed and "source_node_ids" in parsed:
                return {
                    "answer": str(parsed.get("answer", "")).strip(),
                    "source_node_ids": list(parsed.get("source_node_ids", [])),
                    "confidence": float(parsed.get("confidence", 0.9)),
                    "reasoning_summary": str(parsed.get("reasoning_summary", "")).strip()
                }
        except Exception as e:
            print(f"[!] Gemini generation failed: {e}")
            return None

        return None


gemini_service = GeminiService()
