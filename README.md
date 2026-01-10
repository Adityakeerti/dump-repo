# 🎓 Unified Campus Intelligence System

A comprehensive multi-service platform for campus automation, AI-powered assistance, and document processing.

## 📁 Project Structure

```
├── services/              # Backend microservices
│   ├── auth/              # Java - Authentication & session (port 8080)
│   ├── chat/              # Java - Real-time messaging (port 8083)
│   ├── meeting/           # Java - Meeting scheduling (port 8082)
│   ├── library/           # Python - Library management (port 8002)
│   ├── ocr/               # Python - Document OCR (port 8000)
│   └── agent/             # Python - AI Chat with RAG (port 8010)
├── apps/                  # Frontend applications
│   ├── web/               # Main React frontend
│   └── landing/           # Landing page
├── docker/                # Docker configurations
│   ├── docker-compose.yml # Full stack orchestration
│   └── Dockerfile.*       # Service-specific Dockerfiles
├── scripts/               # Startup scripts
│   ├── start_all.bat      # Windows
│   └── start_all.sh       # Linux/Mac
├── database/              # SQL schema files
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Java JDK 17+
- Python 3.9+
- Node.js 18+
- MySQL 8.0+
- MongoDB 7.0+

### Option 1: Local Development (Windows)
```powershell
# 1. Setup database
mysql -u root -p < database/connect_college_schema.sql

# 2. Install Python dependencies
cd services/ocr && pip install -r requirements.txt
cd ../agent && pip install -r requirements.txt
cd ../library && pip install -r requirements.txt

# 3. Start all services
cd ../..
scripts\start_all.bat
```

### Option 2: Docker (Recommended)
```bash
cd docker
cp .env.example .env
# Edit .env with your secrets
docker-compose up -d
```

## 🔌 Service Endpoints

| Service | Port | Description |
|---------|------|-------------|
| Auth | 8080 | JWT authentication, user management |
| Meeting | 8082 | Video meeting scheduling |
| Chat | 8083 | Real-time messaging (WebSocket) |
| OCR | 8000 | Marksheet document processing |
| Agent | 8010 | AI assistant with RAG |
| Library | 8002 | Book catalog & transactions |
| Web App | 3000 | Main frontend |
| Landing | 3001 | Landing page |

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE_CURRENT.md)
- [Database Schema](docs/DATABASE.md)
- [AI & RAG System](docs/AI_SECTION.md)
- [Future Roadmap](docs/FUTURE_ARCHITECTURE.md)

## 🎥 Demo

[![Demo Video](https://img.shields.io/badge/YouTube-Demo-red)](https://youtu.be/RIfFyF_utRg)

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend (Java)** | Spring Boot 3.2/4.0, JPA, JWT |
| **Backend (Python)** | FastAPI, SQLAlchemy, LangChain |
| **AI/ML** | FAISS, HuggingFace Embeddings, Gemini API |
| **Frontend** | React, Vite, TailwindCSS |
| **Databases** | MySQL, MongoDB |
| **DevOps** | Docker, Docker Compose |

---

*Built for HackTheWinter Hackathon 🏆*
"# dump-repo" 
