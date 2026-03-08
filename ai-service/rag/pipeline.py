"""
Hybrid RAG Pipeline
Combines BM25 keyword search + FAISS vector similarity with reciprocal rank fusion reranking.
Uses Google Gemini for response generation (true RAG).
Implements smart query routing and confidence scoring.
"""
import os
import re
import numpy as np
from typing import Dict, List, Tuple
from .knowledge_base import knowledge_base


# ============================================================
# Gemini LLM Integration
# ============================================================

class GeminiGenerator:
    """Google Gemini-based response generator."""
    
    def __init__(self):
        self.model = None
        self.available = False
        self._init_gemini()
    
    def _init_gemini(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("[RAG] No GEMINI_API_KEY found — using template-based responses")
            return
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash")
            self.available = True
            print("[RAG] Gemini initialized successfully (gemini-2.0-flash)")
        except Exception as e:
            print(f"[RAG] Gemini init failed: {e}")
    
    def generate(self, query: str, context_docs: List[Dict], category: str) -> str:
        """Generate a response using Gemini with retrieved context."""
        if not self.available or not self.model:
            return None
        
        # Build context from retrieved documents
        context_parts = []
        for i, doc in enumerate(context_docs[:3], 1):
            d = doc["document"]
            context_parts.append(f"Document {i}: {d['title']}\n{d['content']}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        system_prompt = """You are SupportMind, an enterprise technical support AI assistant. 
You provide clear, accurate, and professional responses to technical queries.
Use ONLY the provided knowledge base documents to answer. If the documents don't contain enough information, say so.
Format your response with clear structure using markdown: headers, bullet points, numbered steps where appropriate.
Be concise but thorough. Include relevant technical details."""

        prompt = f"""{system_prompt}

**Query Category**: {category}

**Retrieved Knowledge Base Documents**:
{context}

**User Query**: {query}

**Instructions**: Based on the retrieved documents above, provide a comprehensive and accurate response to the user's query. Reference specific documents when applicable."""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"[RAG] Gemini generation error: {e}")
            return None


# ============================================================
# Query Router
# ============================================================

class QueryRouter:
    """Smart query routing based on query analysis."""
    
    FAQ_PATTERNS = [
        r'\bhow (do|can|to)\b', r'\bwhat is\b', r'\bwhere (is|can|do)\b',
        r'\bsteps to\b', r'\bguide\b', r'\bprocedure\b', r'\bhow to\b',
        r'\bsetup\b', r'\bconfigure\b', r'\binstall\b', r'\bupdate\b'
    ]
    
    TROUBLESHOOT_PATTERNS = [
        r'\bnot working\b', r'\berror\b', r'\bfail(ed|ing|s)?\b', r'\bcrash\b',
        r'\bissue\b', r'\bproblem\b', r'\bfix\b', r'\btroubleshoot\b',
        r'\bcannot\b', r"\bcan't\b", r'\bunable\b', r'\bwon\'t\b',
        r'\bslow\b', r'\btimeout\b', r'\brefus\b'
    ]
    
    LOG_PATTERNS = [
        r'\blog\b', r'\btrace\b', r'\bstack\b', r'\bdebug\b',
        r'\b(error|err)_?\d+\b', r'\bexception\b', r'\bsegfault\b',
        r'\bmemory_overflow\b', r'\bwatchdog\b', r'\bcomm_failure\b'
    ]
    
    @classmethod
    def classify(cls, query: str) -> str:
        """Classify query into category."""
        query_lower = query.lower()
        
        log_score = sum(1 for p in cls.LOG_PATTERNS if re.search(p, query_lower))
        trouble_score = sum(1 for p in cls.TROUBLESHOOT_PATTERNS if re.search(p, query_lower))
        faq_score = sum(1 for p in cls.FAQ_PATTERNS if re.search(p, query_lower))
        
        if log_score >= 2:
            return "classification"
        elif trouble_score > faq_score:
            return "troubleshooting"
        elif faq_score > 0:
            return "faq"
        else:
            return "general"


# ============================================================
# Hybrid RAG Pipeline
# ============================================================

class HybridRAGPipeline:
    """
    Hybrid Retrieval-Augmented Generation Pipeline.
    
    Pipeline:
    1. Query classification (smart routing)
    2. BM25 keyword search
    3. FAISS vector similarity search
    4. Reciprocal Rank Fusion (RRF) reranking
    5. LLM Generation (Gemini) with retrieved context
    6. Confidence scoring
    """
    
    def __init__(self, model=None):
        self.model = model
        self.router = QueryRouter()
        self.generator = GeminiGenerator()
    
    def reciprocal_rank_fusion(
        self, 
        bm25_results: List[Dict], 
        vector_results: List[Dict], 
        k: int = 60,
        bm25_weight: float = 0.4,
        vector_weight: float = 0.6
    ) -> List[Dict]:
        """
        Reciprocal Rank Fusion (RRF) to merge BM25 and vector search results.
        Score = sum( weight / (k + rank) ) for each result list
        """
        fused_scores = {}
        doc_map = {}
        
        for rank, result in enumerate(bm25_results):
            doc_id = result["index"]
            rrf_score = bm25_weight / (k + rank + 1)
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + rrf_score
            doc_map[doc_id] = result
        
        for rank, result in enumerate(vector_results):
            doc_id = result["index"]
            rrf_score = vector_weight / (k + rank + 1)
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + rrf_score
            doc_map[doc_id] = result
        
        sorted_docs = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
        
        results = []
        for doc_id, score in sorted_docs:
            result = doc_map[doc_id].copy()
            result["rrf_score"] = score
            in_bm25 = any(r["index"] == doc_id for r in bm25_results)
            in_vector = any(r["index"] == doc_id for r in vector_results)
            result["retrieval_methods"] = []
            if in_bm25:
                result["retrieval_methods"].append("bm25")
            if in_vector:
                result["retrieval_methods"].append("vector")
            results.append(result)
        
        return results
    
    def compute_confidence(self, reranked_results: List[Dict], category: str) -> float:
        """Compute confidence score based on RRF, retrieval methods, and category."""
        if not reranked_results:
            return 0.1
        
        top_result = reranked_results[0]
        rrf_score = top_result.get("rrf_score", 0)
        
        max_possible_rrf = 0.4 / 61 + 0.6 / 61
        base_confidence = min(rrf_score / max_possible_rrf, 1.0)
        
        method_count = len(top_result.get("retrieval_methods", []))
        method_bonus = 0.15 if method_count >= 2 else 0.0
        
        cat_adj = {"faq": 0.1, "troubleshooting": 0.0, "classification": -0.05, "general": 0.05}
        confidence = base_confidence + method_bonus + cat_adj.get(category, 0)
        
        return round(max(0.1, min(0.99, confidence)), 4)
    
    def _fallback_response(self, query: str, reranked_results: List[Dict], category: str) -> str:
        """Template-based fallback when Gemini is not available."""
        if not reranked_results:
            return "I couldn't find relevant information in the knowledge base to answer your question. Please contact our support team for further assistance."
        
        top_docs = reranked_results[:3]
        primary = top_docs[0]["document"]
        
        if category == "faq":
            response = f"**{primary['title']}**\n\n{primary['content']}"
        elif category == "troubleshooting":
            response = f"**Troubleshooting: {primary['title']}**\n\n{primary['content']}"
        elif category == "classification":
            response = f"**Log Analysis: {primary['title']}**\n\n{primary['content']}"
            response += "\n\n⚠️ *This query was classified as a technical log analysis.*"
        else:
            response = f"**{primary['title']}**\n\n{primary['content']}"
        
        if len(top_docs) > 1:
            response += "\n\n---\n**Related:**\n"
            for doc in top_docs[1:]:
                response += f"\n• **{doc['document']['title']}**: {doc['document']['content'][:150]}..."
        
        return response
    
    def infer(self, query: str, category: str = None) -> Dict:
        """
        Run the full hybrid RAG pipeline.
        
        Returns:
            dict with response, confidence, sources, category
        """
        # 1. Smart query routing
        detected_category = self.router.classify(query)
        final_category = category if category and category != "general" else detected_category
        
        # 2. BM25 keyword search
        bm25_results = knowledge_base.bm25_search(query, top_k=5)
        
        # 3. FAISS vector similarity search
        vector_results = knowledge_base.vector_search(query, top_k=5)
        
        # 4. Reciprocal Rank Fusion reranking
        if final_category == "classification":
            bm25_w, vector_w = 0.6, 0.4
        elif final_category == "faq":
            bm25_w, vector_w = 0.3, 0.7
        else:
            bm25_w, vector_w = 0.4, 0.6
        
        reranked = self.reciprocal_rank_fusion(
            bm25_results, vector_results,
            bm25_weight=bm25_w, vector_weight=vector_w
        )
        
        # 5. Generate response (Gemini RAG or fallback)
        response = self.generator.generate(query, reranked, final_category)
        generation_method = "gemini"
        
        if not response:
            response = self._fallback_response(query, reranked, final_category)
            generation_method = "template"
        
        # 6. Confidence scoring
        confidence = self.compute_confidence(reranked, final_category)
        
        # 7. Extract sources
        sources = [doc["document"]["id"] for doc in reranked[:3]]
        
        return {
            "response": response,
            "confidence": confidence,
            "sources": sources,
            "category": final_category,
            "retrieval_details": {
                "bm25_results": len(bm25_results),
                "vector_results": len(vector_results),
                "reranked_results": len(reranked),
                "bm25_weight": bm25_w,
                "vector_weight": vector_w,
                "generation_method": generation_method
            }
        }
