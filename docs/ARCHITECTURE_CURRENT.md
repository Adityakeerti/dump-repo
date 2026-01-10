# ARCHITECTURE_CURRENT

Purpose
- This file documents only the currently implemented architecture and code in this repository. It lists every service, every route implemented in the codebase, the exact request/response shapes and side-effects, and the internal data flow for each feature. It does NOT include future or proposed changes.

Scope
- Services covered: `backend-ocr`, `Agent1`, `backend-lib`, `backend-ai`, `backend-chat`, `backend-meeting` and repository-level helpers (`start_servers.bat`, `database/`).

---

## Summary map (single-line)
- `backend-ocr/` — FastAPI marksheet OCR service and persistence logic (`backend-ocr/main.py`).
- `Agent1/` — FastAPI Agent API (chat, ingestion, diagnostics, RAG debug); memory & vector backends under `Agent1/memory`.
- `backend-lib/` — FastAPI Library Management service (SQLAlchemy models & routers in `backend-lib/routers/library.py`).
- `backend-ai/`, `backend-chat/`, `backend-meeting/` — Java (Spring Boot) services. Key controllers with route prefixes are present under `src/main/java/.../controller`.
- `database/` — SQL schema files (e.g., `connect_college_schema.sql`) used by `backend-ocr` and Java services.
- `start_servers.bat` — local orchestration wrapper that launches mvnw/uvicorn/python for services.

---

## Service: backend-ocr (code: `backend-ocr/main.py`)

Purpose
- Handle uploaded marksheets (image or PDF), run OCR preprocessing and extraction, present structured results for user review, and persist verified marksheets and normalized marks into MySQL tables.

Important files referenced
- `backend-ocr/main.py` — FastAPI app and all endpoints.
- `backend-ocr/pipeline.py` — Marksheet pipeline class (`MarksheetProcessor`) loaded at startup (if present).
- `backend-ocr/scripts/` — helper extractors such as `college_extractor.py` for fixed-format college marksheets.

Global runtime behavior
- On startup, `main.py` attempts to load `pipeline.py` and auxiliary scripts; if missing, endpoints that depend on them will return HTTP 500 with init errors.
- Uses a MySQL connection pool (pool name `ocr_pool`), configured in `main.py` via `DB_CONFIG`.
- Creates and serves `uploads/` directory via `StaticFiles` at `/uploads` for display copies.

Endpoints (exact paths and behavior)

- `GET /`
  - Response: JSON {"message": "DOC OC API is running", "status": "ok"}

- `POST /process`
  - Content-type: multipart/form-data
  - Parameters:
    - `file` (UploadFile) — required; image or PDF
    - query `mode` (string) — optional; default `school`; supported value `college` triggers college-specific extractor
    - query `expected_sem` (string) — optional; when provided in `college` mode, compares extracted semester and returns 400 if mismatch
  - Behavior:
    - Saves uploaded file to `uploads/` with sanitized timestamped filename.
    - If file is `.pdf`, converts first page to a 300 DPI JPEG via PyMuPDF (if available); original temporary PDF is removed.
    - Creates a display copy named `<stem>_display<ext>` kept under `uploads/` and returned to caller.
    - If `mode == "college"`, imports and calls `scripts.college_extractor.process_fixed_format(str(temp_path), info_box, marks_box)` and returns a JSON structure: `{ "board": "COLLEGE_FIXED", "data": <dict>, "server_filename": <display_filename> }`. If `expected_sem` supplied and mismatch detected returns 400 with an error JSON describing semester mismatch.
    - Else uses `MarksheetProcessor.process_single_marksheet(str(temp_path))` to run the generic pipeline. If `result['extraction']` contains `data` or points to `final_json`, loads and returns it; otherwise returns a `data` object describing the failure and `server_filename`.
  - Return: JSON with at least `server_filename`, `board` (detected), and `data` (structured extraction or failure note).
  - Side effects: temporary image removed in `finally`; display copy remains.

- `POST /create_user`
# ARCHITECTURE_CURRENT.md

Purpose
- Document the currently implemented architecture and code in this repository. Includes every service, implemented route and handler, precise request/response shapes, side-effects, and internal data flow. Future/proposed changes are excluded and placed in `Md file/FUTURE_ARCHITECTURE.md`.

Scope
- The document covers: `backend-ocr`, `Agent1`, `backend-lib`, `backend-ai`, `backend-chat`, `backend-meeting`, `database/`, and orchestration helpers.

---

## High-level component map

```mermaid
graph TD
    Client[Client apps]
    RP["Reverse Proxy (optional)"]
    AI["backend-ai (Java Spring Boot)"]
    OCR["backend-ocr (Python FastAPI)"]
    AG["Agent1 (Python FastAPI)"]
    LIB["backend-lib (Python FastAPI)"]
    CHAT["backend-chat (Java)"]
    MEET["backend-meeting (Java)"]
    SQL[(MySQL - connect_college)]
    MONGO[(MongoDB - Agent memory & vectors)]

    Client --> RP
    RP --> AI
    RP --> OCR
    RP --> AG
    RP --> LIB
    RP --> CHAT
    RP --> MEET

    AI --> SQL
    OCR --> SQL
    LIB --> SQL
    AG --> MONGO
```

---

## `backend-ocr` — OCR pipeline (file: `backend-ocr/main.py`)

Purpose
- Accept marksheet uploads (image / PDF), run preprocessing and OCR extraction, provide reviewable JSON, and persist verified data to the relational DB.

Key files
- `backend-ocr/main.py` — FastAPI app with all endpoints.
- `backend-ocr/pipeline.py` — `MarksheetProcessor` (dynamically loaded).
- `backend-ocr/scripts/` — board-specific extractors (`college_extractor.py`).

Process flow (detailed sequence)

```mermaid
sequenceDiagram
    participant F as Frontend (user)
    participant O as backend-ocr
    participant P as pipeline / scripts
    participant DB as MySQL

    F->>O: POST /process (file, mode)
    O->>O: save file in uploads/ (timestamped)
    alt file is PDF
        O->>O: convert first page to image via PyMuPDF
    end
    O->>P: call college_extractor or MarksheetProcessor
    P-->>O: extraction JSON or error
    O-->>F: return { server_filename, board, data }

    alt user confirms extraction
        F->>O: POST /submit_marksheets (user_email, marksheets[])
        O->>DB: INSERT marksheet_uploads rows (raw_json_data saved)
        O->>DB: INSERT extracted_marks rows
        O-->>F: return success
    end
```

Implemented endpoints (exact behavior)
- `GET /` — returns a health JSON with message and status.
- `POST /process` — multipart file upload plus query `mode` (default `school`) and optional `expected_sem`:
  - Saves file to `uploads/`, converts PDF -> image if required, creates a `_display` copy, and delegates to `scripts.college_extractor` (college mode) or `MarksheetProcessor.process_single_marksheet` (default) to extract structured data.
  - Returns JSON containing `server_filename`, `board` (detected), and `data` (extraction or failure note).
- `POST /submit_marksheets` — accepts body `{ user_email, marksheets: [ { filename, data, ... } ] }`:
  - Resolves `user_id` from `user_email`.
  - Inserts `marksheet_uploads` row for each file with `raw_json_data` and status `VERIFICATION_PENDING`.
  - Inserts `extracted_marks` rows per subject. For college marksheets inserts `semester_results` where present.
  - Returns commit result and saved count.
- Admin/student management endpoints: `GET /api/admin/marksheets/pending`, `POST /api/admin/marksheets/{upload_id}/verify`, `GET /api/admin/marksheets/history`, `POST /api/student/request`, `GET /api/admin/requests/pending`, `POST /api/admin/requests/{upload_id}/handle` — these perform queries and updates on `marksheet_uploads` and related tables; see source for SQL field lists.

Database tables used (as in code): `marksheet_uploads`, `extracted_marks`, `semester_results`.

---

## `Agent1` — Chat agent and RAG tooling (files under `Agent1/api/*`)

Purpose
- Host an agent service that stores conversational context, runs retrieval on vector stores, orchestrates LLM calls via an orchestration graph, and ingests documents into a vector DB.

App wiring
- `Agent1/api/app.py` constructs the FastAPI app, creates a shared `memory` provider (`MongoClientProvider`) and injects it into route modules using `set_memory_backend(memory)`.

Routes and exact behaviors
- Mounted routers:
  - `/chat` — `Agent1/api/routes/chat.py`
  - `/documents` — `Agent1/api/routes/ingest.py`
  - `/diagnostics` — `Agent1/api/routes/diagnostics.py`
  - `/rag` — `Agent1/api/routes/rag_debug.py`

Chat endpoint flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent1 /chat
    participant M as Memory (Mongo/Vector)
    participant G as Orchestration Graph
    participant L as LLM / ChatbotService

    U->>A: POST /chat {message, user_context}
    A->>M: ensure user profile exists
    A->>M: store incoming message
    A->>G: invoke orchestration (message + context)
    alt orchestration chooses RAG
        G->>M: retrieve_chunks(query)
        M-->>G: chunks
        G->>L: prompt with chunks
        L-->>G: answer
        G-->>A: {response, rag_used:true, chunks}
    else orchestration creates agent task
        G-->>A: {task_created:true, response}
    end
    A-->>U: ChatResponse (status, message, rag_used, retrieved_chunks)
```

`POST /documents/ingest` (ingest flow)
- Requires authenticated user with role in `{ADMIN, MODERATOR, FACULTY}`.
- Saves uploaded PDF to temporary file, extracts text via `utils.pdf_loader.extract_text_from_pdf`, chunks with `utils.chunking.chunk_text`, and stores chunks in the configured vector store via `Agent1/memory/vector/*`.

Diagnostics & debugging
- `GET /diagnostics/health` — returns runtime status including `mongo_connected` (via `memory.ping()`), configured `vector_db` and `llm_provider` setting.
- `POST /rag/debug` — returns raw retrieval chunks for a query using `ChatbotService.retrieve_chunks`.

Auth helpers
- `Agent1/api/middleware/auth.py` exposes `extract_user_context` (strict) and `get_optional_user_context` (optional) that decode JWTs using `settings.jwt_secret` and return `UserContext` objects.

Memory & embeddings (implemented)
- `Agent1/memory/vector/chroma.py` and `faiss_store.py` implement vector store adapters. Embeddings are created using `HuggingFaceEmbeddings` via `langchain_community.embeddings` and are configurable in `Agent1/config`.

---

## `backend-lib` — Library Management (files: `backend-lib/main.py`, `backend-lib/routers/library.py`)

Purpose
- Catalog books, issue/return transactions, compute fines, and provide administrative stats.

Core flows (diagrams)

```mermaid
sequenceDiagram
    participant UI
    participant LIB as backend-lib
    participant DB as MySQL

    UI->>LIB: POST /api/library/transaction/issue {user_id, book_id, days}
    LIB->>DB: check book availability, user exists
    alt available
        LIB->>DB: insert LibraryTransaction (ISSUED), decrement book.available_copies
        LIB-->>UI: {message, due_date}
    else not available
        LIB-->>UI: 400 Book not available
    end

    UI->>LIB: POST /api/library/transaction/return {user_id, book_id}
    LIB->>DB: find active transaction
    LIB->>DB: compute fine if overdue, update transaction, increment available_copies
    LIB-->>UI: {message, fine_amount}
```

Implemented endpoints
- `GET /api/library/books`, `POST /api/library/books`, `POST /api/library/transaction/issue`, `POST /api/library/transaction/return`, `GET /api/library/student/my-books`, `GET /api/library/stats`, `GET /api/library/admin/overdue`.

---

## `backend-ai`, `backend-chat`, `backend-meeting` (Java)

Purpose
- Java Spring Boot modules providing authentication/session management (`backend-ai`), chat REST endpoints and real-time messaging (`backend-chat`), and meeting scheduling/signaling (`backend-meeting`).

Auth/session concise flow (from `AuthController`)

```mermaid
sequenceDiagram
    participant Client
    participant Auth as backend-ai
    participant DB as MySQL

    Client->>Auth: POST /auth/login {username/password}
    Auth->>DB: validate credentials
    Auth-->>Client: AuthResponse {token, sessionId}
    Client->>OtherService: requests (with Bearer token)
    OtherService->>Auth: (optional) validate session/token or decode JWT locally
```

Representative chat endpoints (see `backend-chat` source): `/api/users`, `/api/rooms`, `/api/history/*`, `/api/groups/*`.

---

## Repo orchestration & data

- `start_servers.bat` starts/controls services locally; it checks MongoDB and launches Java and Python services in separate terminals.
- `database/connect_college_schema.sql` provides the relational schema used by `backend-ocr` and Java services.
- `uploads/` in `backend-ocr` stores display images created during processing.

---

## Next steps for me (pick one)
- (A) Add per-endpoint inline sequence diagrams for `/process`, `/submit_marksheets`, chat flow, ingest flow and library issue/return (if you pick this I will add more granular steps and DB column mappings).
- (B) Run a line-by-line consistency pass producing source file links with line ranges for every documented route.

Reply with `A` or `B` to continue.

## Source file locations (route → source link)

- backend-ocr
  - GET `/` : [backend-ocr/main.py](backend-ocr/main.py#L147)
  - POST `/process` : [backend-ocr/main.py](backend-ocr/main.py#L151-L152)
  - handler `process_marksheet` : [backend-ocr/main.py](backend-ocr/main.py#L152-L165)
  - POST `/create_user` : [backend-ocr/main.py](backend-ocr/main.py#L268-L269)
  - GET `/user/{email}` : [backend-ocr/main.py](backend-ocr/main.py#L297-L298)
  - POST `/submit_marksheets` : [backend-ocr/main.py](backend-ocr/main.py#L317-L318)
  - GET `/user_marksheets/{email}` : [backend-ocr/main.py](backend-ocr/main.py#L465-L466)
  - GET `/api/admin/marksheets/pending` : [backend-ocr/main.py](backend-ocr/main.py#L520)
  - POST `/api/admin/marksheets/{upload_id}/verify` : [backend-ocr/main.py](backend-ocr/main.py#L547)
  - GET `/api/admin/marksheets/history` : [backend-ocr/main.py](backend-ocr/main.py#L569)
  - POST `/api/student/request` : [backend-ocr/main.py](backend-ocr/main.py#L602)
  - GET `/api/admin/requests/pending` : [backend-ocr/main.py](backend-ocr/main.py#L647)
  - POST `/api/admin/requests/{upload_id}/handle` : [backend-ocr/main.py](backend-ocr/main.py#L667)

- Agent1
  - POST `/chat/` : [Agent1/api/routes/chat.py](Agent1/api/routes/chat.py#L57)
  - POST `/documents/ingest` : [Agent1/api/routes/ingest.py](Agent1/api/routes/ingest.py#L21)
  - GET `/diagnostics/health` : [Agent1/api/routes/diagnostics.py](Agent1/api/routes/diagnostics.py#L17)
  - POST `/rag/debug` : [Agent1/api/routes/rag_debug.py](Agent1/api/routes/rag_debug.py#L28)
  - Auth middleware helpers (`extract_user_context`, `get_optional_user_context`) : [Agent1/api/middleware/auth.py](Agent1/api/middleware/auth.py#L1)

- backend-lib
  - app root `GET /` : [backend-lib/main.py](backend-lib/main.py#L21)
  - GET `/api/library/books` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L20)
  - POST `/api/library/books` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L29)
  - POST `/api/library/transaction/issue` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L39)
  - POST `/api/library/transaction/return` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L68)
  - GET `/api/library/student/my-books` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L113)
  - GET `/api/library/stats` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L123)
  - GET `/api/library/admin/overdue` : [backend-lib/routers/library.py](backend-lib/routers/library.py#L144)

- Java services (representative controllers)
  - `AuthController` (auth/session endpoints) : [backend-ai/src/main/java](backend-ai/src/main/java) (see controller class under `controller/AuthController.java`)
  - `ResourceController` (chat endpoints) : [backend-chat/src/main/java](backend-chat/src/main/java) (see `controller/ResourceController.java`)

If you'd like, I can expand each link to exact method line ranges inside the Java controller files and add per-endpoint sequence diagrams next.

## Per-endpoint sequence diagrams (detailed)

### `POST /process` (backend-ocr)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant O as backend-ocr
    participant FS as FileSystem
    participant P as pipeline
    participant DB as MySQL

    F->>O: POST process file
    O->>FS: write temp upload
    alt file is PDF
        O->>O: convert PDF to image
        O->>FS: remove temp PDF
    end
    O->>FS: create display copy
    alt mode is college
        O->>P: process fixed format
    else
        O->>P: process single marksheet
    end
    P-->>O: extraction JSON
    O-->>F: return data
    Note over O: Temp image removed and display copy saved in uploads
```

### `POST /submit_marksheets` (backend-ocr)

```mermaid
sequenceDiagram
  participant F as Frontend
  participant O as backend-ocr
  participant DB as MySQL

  F->>O: POST /submit_marksheets { user_email, marksheets[] }
  O->>DB: SELECT user.id FROM users WHERE email = :user_email
  loop for each marksheet
    O->>DB: INSERT INTO marksheet_uploads (user_id, raw_json_data, status=VERIFICATION_PENDING, server_filename, created_at)
    O->>DB: INSERT INTO extracted_marks (upload_id, subject, marks_obtained, max_marks)
    alt college semester data present
    O->>DB: INSERT INTO semester_results (upload_id, semester, aggregated_data)
    end
  end
  O-->>F: return { inserted_count, status: OK }
```

### `POST /chat` (Agent1)

```mermaid
sequenceDiagram
  participant U as User
  participant A as Agent1 /chat
  participant M as Memory (MongoDB)
  participant V as VectorStore
  participant G as Orchestration Graph
  participant L as LLM Provider

  U->>A: POST /chat { message, user_context }
  A->>M: ensure user profile exists / load context
  A->>M: append incoming message to conversation collection
  A->>G: invoke orchestration(message, user_context)
  alt graph selects retrieval
    G->>V: retrieve_chunks(query)
    V-->>G: chunks
    G->>L: prompt with retrieved chunks + system prompt
    L-->>G: generated_answer
  else graph uses internal task
    G-->>A: generated task response
  end
  A->>M: persist assistant response
  A-->>U: ChatResponse { message, rag_used, retrieved_chunks }
```

### `POST /documents/ingest` (Agent1)

```mermaid
sequenceDiagram
  participant U as Authenticated User
  participant A as Agent1 /documents/ingest
  participant FS as FileSystem (temp)
  participant E as Extractor (pdf_loader)
  participant C as Chunker
  participant V as VectorStore

  U->>A: POST /documents/ingest (file)
  A->>FS: save temp file
  A->>E: extract_text_from_pdf(temp_file)
  E-->>A: plain_text
  A->>C: chunk_text(plain_text)
  C-->>A: chunks[]
  loop for each chunk
    A->>V: upsert_vector({ text: chunk.text, metadata: { source, page } })
  end
  A-->>U: return { inserted_chunks, vector_store: configured }
```

### Library issue / return (backend-lib)

```mermaid
sequenceDiagram
  participant UI
  participant LIB as backend-lib
  participant DB as MySQL

  UI->>LIB: POST /api/library/transaction/issue { user_id, book_id }
  LIB->>DB: SELECT available_copies FROM books WHERE id = :book_id
  alt available > 0
    LIB->>DB: INSERT INTO transactions (user_id, book_id, status=ISSUED, due_date)
    LIB->>DB: UPDATE books SET available_copies = available_copies - 1
    LIB-->>UI: { success, due_date }
  else
    LIB-->>UI: { error: 'Not available' }
  end

  UI->>LIB: POST /api/library/transaction/return { user_id, book_id }
  LIB->>DB: SELECT transaction WHERE user_id AND book_id AND status=ISSUED
  LIB->>DB: compute overdue days, fine = max(0, days_overdue) * 5
  LIB->>DB: UPDATE transaction SET status=RETURNED, fine_amount
  LIB->>DB: UPDATE books SET available_copies = available_copies + 1
  LIB-->>UI: { success, fine_amount }
```
