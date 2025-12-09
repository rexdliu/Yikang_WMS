"""轻量级 RAG 服务实现"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "rag" / "warehouse_knowledge.json"


@dataclass
class KnowledgeChunk:
    id: str
    title: str
    category: str
    content: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "content": self.content,
        }


class SimpleRAGService:
    def __init__(self) -> None:
        self.chunks: List[KnowledgeChunk] = self._load_chunks()

    @staticmethod
    def _load_chunks() -> List[KnowledgeChunk]:
        if not DATA_PATH.exists():
            return []
        raw_items = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        return [KnowledgeChunk(**item) for item in raw_items]

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return [token for token in text.lower().replace("-", " ").split() if token]

    def _score(self, query_tokens: List[str], chunk_tokens: List[str]) -> float:
        if not query_tokens or not chunk_tokens:
            return 0.0
        intersection = len(set(query_tokens) & set(chunk_tokens))
        if intersection == 0:
            return 0.0
        return intersection / math.sqrt(len(query_tokens) * len(chunk_tokens))

    def query(self, question: str, top_k: int = 3) -> Dict[str, List[Dict[str, str]] | str]:
        query_tokens = self._tokenize(question)
        scored = []
        for chunk in self.chunks:
            score = self._score(query_tokens, self._tokenize(chunk.content + " " + chunk.title))
            if score > 0:
                scored.append((score, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)
        top_chunks = [chunk for _, chunk in scored[:top_k]] or self.chunks[:1]
        summary_lines = [
            f"- {chunk.title}：{chunk.content}" for chunk in top_chunks
        ]
        answer = "\n".join(["以下建议基于知识库检索结果：", *summary_lines])
        return {
            "answer": answer,
            "sources": [chunk.to_dict() for chunk in top_chunks],
        }


rag_service = SimpleRAGService()
