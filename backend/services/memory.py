"""
memory.py - Short-Term Conversation Memory Manager
==================================================
Maintains a sliding window of exactly the last 3 interactions.
Automatically evicts the oldest item upon adding a fourth.
Supports retrieval, formatting for Gemini context, and user memory clearing.
"""

from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
import threading
from typing import Any, Dict, List

from backend.models.query import MemoryItem


class MemoryManager:
    def __init__(self, max_capacity: int = 3):
        self.max_capacity = max_capacity
        self._memory: deque[MemoryItem] = deque(maxlen=max_capacity)
        self._lock = threading.Lock()

    def add_interaction(
        self,
        query: str,
        answer: str,
        source_node_ids: List[str]
    ) -> None:
        with self._lock:
            now_iso = datetime.now(timezone.utc).isoformat()
            item = MemoryItem(
                query=query,
                answer=answer,
                source_node_ids=source_node_ids,
                timestamp=now_iso
            )
            self._memory.append(item)

    def get_interactions(self) -> List[MemoryItem]:
        with self._lock:
            return list(self._memory)

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            count = len(self._memory)
            return {
                "count": count,
                "max_capacity": self.max_capacity,
                "label": f"{count} / {self.max_capacity} interactions",
                "items": [item.model_dump() for item in self._memory]
            }

    def clear(self) -> None:
        with self._lock:
            self._memory.clear()

    def format_for_prompt(self) -> str:
        with self._lock:
            if not self._memory:
                return "No previous interactions."
            lines = []
            for i, item in enumerate(self._memory, start=1):
                sources_str = ", ".join(item.source_node_ids)
                lines.append(f"Interaction {i}:")
                lines.append(f"  User: {item.query}")
                lines.append(f"  System Answer: {item.answer}")
                lines.append(f"  Sources: [{sources_str}]")
            return "\n".join(lines)


memory_manager = MemoryManager(max_capacity=3)
