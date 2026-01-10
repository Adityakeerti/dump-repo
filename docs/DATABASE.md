# Database Documentation & Schema Design

## 1. Relational Database (MySQL)
The system uses a normalized relational schema (`connect_college`) optimized for complex joins involved in academic reporting.

### A. Entity-Relationship Diagrams (ERD)

#### Module 1: Academic & Identity
This diagram focuses on the core user data and their academic progression.

```mermaid
erDiagram
    USERS ||--o{ STUDENT_PROFILES : "1:1 Extension"
    USERS ||--o{ SUBJECT_ENROLLMENTS : "1:N"
    SUBJECTS ||--o{ SUBJECT_ENROLLMENTS : "1:N"
    SUBJECT_ENROLLMENTS ||--o{ ATTENDANCE_LOGS : "Daily Logs"

    USERS {
        bigint user_id PK
        string email
        string password_hash
        enum role "STUDENT, ADMIN, FACULTY"
    }

    STUDENT_PROFILES {
        bigint profile_id PK
        string college_roll_number UK
        int current_semester
        string branch_code
    }

    SUBJECTS {
        bigint subject_id PK
        string subject_code UK "e.g., KCS-501"
        int credits
    }

    ATTENDANCE_LOGS {
        bigint log_id PK
        date attendance_date
        enum status "PRESENT, ABSENT"
    }
```

#### Module 2: Smart Library
Tracks the physical movement of assets.

```mermaid
erDiagram
    CATEGORIES ||--o{ BOOKS : "Categorizes"
    BOOKS ||--o{ LIBRARY_TRANSACTIONS : "Circulation"
    USERS ||--o{ LIBRARY_TRANSACTIONS : "Borrower"
    LIBRARY_TRANSACTIONS ||--o{ LIBRARY_FINES : "Penalties"

    BOOKS {
        bigint book_id PK
        string barcode_id UK
        string isbn
        int available_copies
    }

    LIBRARY_TRANSACTIONS {
        bigint transaction_id PK
        datetime issue_date
        datetime due_date
        datetime return_date
        enum status "ISSUED, RETURNED, OVERDUE"
    }
```

### B. Data Dictionary (Key Tables)

#### `marksheet_uploads`
Stores the metadata of every file processed by the OCR engine.
| Column | Type | Description |
| :--- | :--- | :--- |
| `upload_id` | `BIGINT (PK)` | Unique identifier. |
| `user_id` | `BIGINT (FK)` | Owner of the document. |
| `status` | `ENUM` | `PROCESSING`, `VERIFICATION_PENDING`, `APPROVED`, `REJECTED`. |
| `raw_json_data` | `JSON` | Complete output from the OCR pipeline (archived for auditing). |
| `confidence_score` | `FLOAT` | Average confidence of the extraction (0.0 to 1.0). |

#### `extracted_marks`
Normalized data parsed from the `raw_json_data`.
| Column | Type | Description |
| :--- | :--- | :--- |
| `mark_id` | `BIGINT (PK)` | Unique identifier. |
| `upload_id` | `BIGINT (FK)` | Link to parent upload. |
| `subject_code` | `VARCHAR` | The standard code (e.g., "KCS-502") used for mapping to `subjects`. |
| `marks_obtained` | `FLOAT` | Total marks achieved. |
| `grade` | `VARCHAR` | Letter grade (A+, B, F) if available. |

---

## 2. NoSQL Database (MongoDB)
Used by `Agent1` for flexible, high-volume data storage.

### Collections

#### `chat_history`
Maintains conversational context for the AI.
```json
{
  "_id": "ObjectId('...')",
  "session_id": "uuid-v4",
  "user_id": 105,
  "messages": [
    { "role": "user", "content": "What is my attendance in OS?", "timestamp": "..." },
    { "role": "assistant", "content": "Your attendance in Operating Systems is 78%.", "timestamp": "..." }
  ]
}
```

#### `rag_documents`
Vector store for RAG (Retrieval Augmented Generation).
```json
{
  "_id": "ObjectId('...')",
  "doc_type": "NOTICE",
  "content": "Holiday declared on 15th Aug...",
  "embedding": [0.12, -0.45, 0.88, ...],
  "metadata": {
    "source": "admin_announcement",
    "date": "2023-08-10"
  }
}
```

Note: the repository includes vector embedding helpers (Agent1) and supports multiple backends (Mongo/Chroma/FAISS) depending on runtime configuration. The exact dimensionality depends on the chosen embedding model and is not hard-coded in the schema.
