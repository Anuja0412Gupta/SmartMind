"""
Knowledge Base Manager
Loads documents, builds BM25 index, and uses Gemini embeddings for vector search.
Lightweight — no local ML models, suitable for Render free tier (512MB RAM).
"""
import json
import os
import re
import numpy as np


class KnowledgeBase:
    def __init__(self):
        self.documents = []
        self.doc_texts = []
        self.tokenized_docs = []
        self.bm25 = None
        self.doc_embeddings = None
        self.gemini_model = None
    
    def load_documents(self, data_dir: str = None):
        """Load knowledge base articles from JSON files."""
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "knowledge")
        
        self.documents = []
        for filename in os.listdir(data_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(data_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    articles = json.load(f)
                    if isinstance(articles, list):
                        self.documents.extend(articles)
                    else:
                        self.documents.append(articles)
        
        self.doc_texts = []
        for doc in self.documents:
            text = f"{doc.get('title', '')} {doc.get('content', '')} {' '.join(doc.get('tags', []))}"
            self.doc_texts.append(text)
        
        print(f"[KnowledgeBase] Loaded {len(self.documents)} documents")
    
    def tokenize(self, text: str) -> list:
        """Simple tokenizer for BM25."""
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        tokens = text.split()
        stop_words = {'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
                      'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'will', 'do',
                      'does', 'did', 'has', 'have', 'had', 'be', 'was', 'were', 'been',
                      'are', 'am', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
                      'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our'}
        return [t for t in tokens if t not in stop_words and len(t) > 1]
    
    def build_bm25_index(self):
        """Build BM25 index from document texts."""
        from rank_bm25 import BM25Okapi
        self.tokenized_docs = [self.tokenize(text) for text in self.doc_texts]
        self.bm25 = BM25Okapi(self.tokenized_docs)
        print(f"[KnowledgeBase] BM25 index built with {len(self.tokenized_docs)} documents")
    
    def build_vector_index(self, gemini_embed_fn):
        """Build vector index using Gemini embeddings (API-based, no local model)."""
        self.gemini_model = gemini_embed_fn
        
        print("[KnowledgeBase] Generating document embeddings via Gemini API...")
        self.doc_embeddings = []
        
        # Embed in batches to avoid rate limits
        batch_size = 5
        for i in range(0, len(self.doc_texts), batch_size):
            batch = self.doc_texts[i:i+batch_size]
            try:
                import google.generativeai as genai
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=batch,
                    task_type="retrieval_document"
                )
                self.doc_embeddings.extend(result['embedding'])
            except Exception as e:
                print(f"[KnowledgeBase] Embedding batch {i} failed: {e}")
                # Use zero vectors as fallback
                for _ in batch:
                    self.doc_embeddings.append([0.0] * 768)
        
        self.doc_embeddings = np.array(self.doc_embeddings, dtype='float32')
        # Normalize for cosine similarity
        norms = np.linalg.norm(self.doc_embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        self.doc_embeddings = self.doc_embeddings / norms
        
        print(f"[KnowledgeBase] Vector index built ({len(self.doc_texts)} docs, dim={self.doc_embeddings.shape[1]})")
    
    def bm25_search(self, query: str, top_k: int = 5) -> list:
        """Search using BM25 keyword matching."""
        if self.bm25 is None:
            return []
        
        tokenized_query = self.tokenize(query)
        scores = self.bm25.get_scores(tokenized_query)
        
        top_indices = np.argsort(scores)[::-1][:top_k]
        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append({
                    "index": int(idx),
                    "document": self.documents[idx],
                    "score": float(scores[idx]),
                    "method": "bm25"
                })
        return results
    
    def vector_search(self, query: str, top_k: int = 5) -> list:
        """Search using Gemini embedding cosine similarity (no FAISS needed)."""
        if self.doc_embeddings is None:
            return []
        
        try:
            import google.generativeai as genai
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query"
            )
            query_emb = np.array(result['embedding'], dtype='float32')
            # Normalize
            norm = np.linalg.norm(query_emb)
            if norm > 0:
                query_emb = query_emb / norm
        except Exception as e:
            print(f"[KnowledgeBase] Query embedding failed: {e}")
            return []
        
        # Cosine similarity via dot product (vectors are normalized)
        similarities = np.dot(self.doc_embeddings, query_emb)
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0:
                results.append({
                    "index": int(idx),
                    "document": self.documents[idx],
                    "score": float(similarities[idx]),
                    "method": "vector"
                })
        return results
    
    def get_embedding(self, text: str) -> list:
        """Get embedding for a single text (used by semantic cache)."""
        try:
            import google.generativeai as genai
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            print(f"[KnowledgeBase] Embedding failed: {e}")
            return None
    
    def get_document_count(self):
        return len(self.documents)


# Singleton instance
knowledge_base = KnowledgeBase()
