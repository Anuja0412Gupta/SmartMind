"""
SupportMind AI Inference Service
FastAPI application with hybrid RAG pipeline (BM25 + Vector + RRF Reranking)
"""
import os
import time
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

# Global state
model = None
pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize models and knowledge base on startup."""
    global model, pipeline
    
    print("[AI Service] Initializing...")
    start = time.time()
    
    # Load sentence-transformers model
    from sentence_transformers import SentenceTransformer
    print("[AI Service] Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Initialize knowledge base
    from rag.knowledge_base import knowledge_base
    knowledge_base.load_documents()
    knowledge_base.build_bm25_index()
    knowledge_base.build_vector_index(model)
    
    # Initialize pipeline
    from rag.pipeline import HybridRAGPipeline
    pipeline = HybridRAGPipeline(model=model)
    
    elapsed = time.time() - start
    print(f"[AI Service] Ready in {elapsed:.2f}s")
    print(f"[AI Service] Knowledge base: {knowledge_base.get_document_count()} documents")
    
    yield
    
    print("[AI Service] Shutting down...")


app = FastAPI(
    title="SupportMind AI Service",
    description="Hybrid RAG inference with BM25 + Vector Similarity + RRF Reranking",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Request/Response Models
# ============================================================

class InferRequest(BaseModel):
    query: str
    category: Optional[str] = "general"

class InferResponse(BaseModel):
    response: str
    confidence: float
    sources: List[str]
    category: str
    retrieval_details: dict

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int


# ============================================================
# API Endpoints
# ============================================================

@app.get("/api/health")
async def health_check():
    from rag.knowledge_base import knowledge_base
    return {
        "status": "healthy",
        "service": "ai-service",
        "model": "all-MiniLM-L6-v2",
        "documents_loaded": knowledge_base.get_document_count(),
        "timestamp": time.time()
    }


@app.post("/api/infer", response_model=InferResponse)
async def infer(request: InferRequest):
    """Run hybrid RAG inference pipeline on a query."""
    if not pipeline:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query text is required")
    
    start_time = time.time()
    
    try:
        result = pipeline.infer(
            query=request.query.strip(),
            category=request.category
        )
        
        processing_time = time.time() - start_time
        result["retrieval_details"]["processing_time"] = round(processing_time, 4)
        
        return InferResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@app.post("/api/embed", response_model=EmbedResponse)
async def get_embedding(request: EmbedRequest):
    """Get embedding vector for a text (used by semantic cache)."""
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        embedding = model.encode([request.text.strip()])
        embedding_list = embedding[0].tolist()
        
        return EmbedResponse(
            embedding=embedding_list,
            dimension=len(embedding_list)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


@app.get("/api/knowledge/stats")
async def knowledge_stats():
    """Get knowledge base statistics."""
    from rag.knowledge_base import knowledge_base
    
    categories = {}
    for doc in knowledge_base.documents:
        cat = doc.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1
    
    return {
        "total_documents": knowledge_base.get_document_count(),
        "categories": categories,
        "bm25_indexed": knowledge_base.bm25 is not None,
        "faiss_indexed": knowledge_base.faiss_index is not None
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
