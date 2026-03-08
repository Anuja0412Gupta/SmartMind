"""
Knowledge Base Manager
Loads documents, builds BM25 and FAISS indices for hybrid retrieval.
"""
import json
import os
import re
import numpy as np
from rank_bm25 import BM25Okapi


class KnowledgeBase:
    def __init__(self):
        self.documents = []
        self.doc_texts = []
        self.tokenized_docs = []
        self.bm25 = None
        self.faiss_index = None
        self.embeddings = None
        self.model = None
    
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
        
        # Build searchable text for each document
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
        # Remove common stop words
        stop_words = {'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
                      'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'will', 'do',
                      'does', 'did', 'has', 'have', 'had', 'be', 'was', 'were', 'been',
                      'are', 'am', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
                      'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our'}
        return [t for t in tokens if t not in stop_words and len(t) > 1]
    
    def build_bm25_index(self):
        """Build BM25 index from document texts."""
        self.tokenized_docs = [self.tokenize(text) for text in self.doc_texts]
        self.bm25 = BM25Okapi(self.tokenized_docs)
        print(f"[KnowledgeBase] BM25 index built with {len(self.tokenized_docs)} documents")
    
    def build_vector_index(self, model):
        """Build FAISS vector index from document embeddings."""
        import faiss
        
        self.model = model
        print("[KnowledgeBase] Generating document embeddings...")
        self.embeddings = model.encode(self.doc_texts, show_progress_bar=True)
        self.embeddings = np.array(self.embeddings, dtype='float32')
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(self.embeddings)
        
        # Build FAISS index
        dimension = self.embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatIP(dimension)  # Inner product = cosine sim after normalization
        self.faiss_index.add(self.embeddings)
        
        print(f"[KnowledgeBase] FAISS index built (dim={dimension}, docs={len(self.doc_texts)})")
    
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
        """Search using FAISS vector similarity."""
        if self.faiss_index is None or self.model is None:
            return []
        
        import faiss
        
        query_embedding = self.model.encode([query])
        query_embedding = np.array(query_embedding, dtype='float32')
        faiss.normalize_L2(query_embedding)
        
        distances, indices = self.faiss_index.search(query_embedding, top_k)
        
        results = []
        for i, (idx, dist) in enumerate(zip(indices[0], distances[0])):
            if idx >= 0:
                results.append({
                    "index": int(idx),
                    "document": self.documents[idx],
                    "score": float(dist),
                    "method": "vector"
                })
        return results
    
    def get_document_count(self):
        return len(self.documents)


# Singleton instance
knowledge_base = KnowledgeBase()
