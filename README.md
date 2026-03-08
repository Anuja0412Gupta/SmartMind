# SupportMind

**Scalable AI Support Infrastructure with Asynchronous Processing**

> Enterprise-grade intelligent support platform that processes technical queries using AI retrieval pipelines, asynchronous job processing, and a professional operations dashboard.

---

## System Architecture

```
User Dashboard (React)
       ↓
API Service (Node.js / Express)
       ↓
Redis Queue (BullMQ)   ←→   Semantic Cache (Redis + Embeddings)
       ↓
Worker Service (Dynamic Scaling)
       ↓
AI Inference Service (Python FastAPI)
       ↓
Hybrid Retrieval: BM25 + FAISS Vector + RRF Reranking
       ↓
Response → MongoDB → Dashboard
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite, Material UI, Recharts, Axios |
| **API Service** | Node.js, Express.js, Mongoose |
| **Queue** | BullMQ + Redis |
| **Worker** | Node.js with Dynamic Worker Scaling |
| **AI Service** | Python FastAPI, sentence-transformers, FAISS |
| **Retrieval** | Hybrid BM25 + Vector Similarity + RRF Reranking |
| **Caching** | Semantic Cache (Redis + Cosine Similarity) |
| **Database** | MongoDB Atlas |
| **Deployment** | Render (backend), Vercel (frontend) |

---

## Key Features

### 1. Hybrid Retrieval Pipeline (BM25 + Vector + Reranking)
- BM25 keyword search for lexical matching
- FAISS vector similarity for semantic understanding
- Reciprocal Rank Fusion (RRF) merges and reranks results
- Category-adaptive weights (FAQ → semantic-heavy, logs → keyword-heavy)

### 2. Semantic Caching Layer
- Query embeddings stored in Redis
- Cosine similarity matching (threshold: 0.92)
- Exact match fast path + embedding-based similarity search
- Reduces repeated LLM inference and lowers response latency

### 3. Dynamic Worker Scaling
- BullMQ workers auto-scale based on queue depth
- Configurable MIN/MAX workers and scale thresholds
- Queue depth monitored every 10 seconds

### 4. Smart Query Routing
- FAQ queries → direct knowledge base retrieval
- Troubleshooting → full hybrid RAG pipeline
- Technical logs → classification pipeline

### 5. Confidence Scoring & Escalation
- Confidence computed from RRF scores + multi-method bonus
- Low-confidence queries auto-escalated for admin review
- Escalation dashboard for manual resolution

### 6. Feedback Learning System
- 👍/👎 ratings on AI responses
- Analytics track accuracy from user feedback

---

## Project Structure

```
supportmind/
├── api-service/          # Express.js API server
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API route handlers
│   ├── services/         # Cache & queue services
│   ├── middleware/        # Logging middleware
│   └── server.js
├── worker-service/       # BullMQ worker with dynamic scaling
│   └── worker.js
├── ai-service/           # Python FastAPI
│   ├── rag/              # RAG pipeline & knowledge base
│   ├── data/knowledge/   # Knowledge base articles
│   └── main.py
├── frontend/             # React + Vite dashboard
│   └── src/
│       ├── components/   # Layout, sidebar
│       ├── pages/        # 6 dashboard pages
│       └── services/     # API client
├── shared/               # Shared Redis client
├── render.yaml           # Render deployment config
└── README.md
```

---

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/support/query` | Submit a support query |
| `GET` | `/api/jobs/:jobId` | Check job status |
| `GET` | `/api/support/result/:jobId` | Get query result |
| `GET` | `/api/support/history` | Paginated query history |
| `POST` | `/api/support/feedback` | Submit feedback (up/down) |
| `GET` | `/api/analytics/summary` | Analytics dashboard data |
| `GET` | `/api/jobs` | List all jobs + queue metrics |
| `GET` | `/api/escalation` | Get escalated queries |
| `POST` | `/api/escalation/:id/resolve` | Resolve escalation |
| `GET` | `/api/logs` | System logs (filterable) |
| `POST` | `/api/infer` | AI inference (internal) |
| `POST` | `/api/embed` | Get embedding (internal) |

### Submit Query

```bash
curl -X POST http://localhost:5000/api/support/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my device?"}'
```

Response:
```json
{ "jobId": "job_a1b2c3d4" }
```

### Check Job Status

```bash
curl http://localhost:5000/api/jobs/job_a1b2c3d4
```

Response:
```json
{
  "jobId": "job_a1b2c3d4",
  "status": "completed",
  "response": "...",
  "confidence": 0.91,
  "sources": ["kb_001"]
}
```

---

## Setup & Running

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### 1. Install Dependencies

```bash
# API Service
cd api-service && npm install

# Worker Service
cd ../worker-service && npm install

# AI Service
cd ../ai-service && pip install -r requirements.txt

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` in `api-service/` and `worker-service/`:

```
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
AI_SERVICE_URL=http://localhost:8000
```

### 3. Start Services

```bash
# Terminal 1: AI Service
cd ai-service && uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: API Service
cd api-service && node server.js

# Terminal 3: Worker Service
cd worker-service && node worker.js

# Terminal 4: Frontend
cd frontend && npm run dev
```

---

## Deployment

### Backend (Render)
1. Push to GitHub
2. Create services in Render from `render.yaml`
3. Set environment variables (MONGODB_URI, REDIS_URL)

### Frontend (Vercel)
1. Import `frontend/` directory
2. Set `VITE_API_URL` to your Render API URL
3. Deploy

---

## Dashboard Pages

| Page | Description |
|------|-------------|
| **Query Console** | Submit queries, view AI responses with confidence & sources |
| **Query History** | Browse all past queries with search & pagination |
| **Analytics** | Charts: daily queries, accuracy, latency, categories |
| **Job Monitor** | Queue health metrics, job status table |
| **Escalation Panel** | Review & resolve low-confidence responses |
| **System Logs** | Filter system events by service, level, event |

---

## License

MIT
