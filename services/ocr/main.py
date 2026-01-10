"""
DOC OC Backend - FastAPI service for marksheet OCR processing
Connects to connect_college MySQL database
"""

from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import shutil
import os
import logging
from pathlib import Path
import sys
import uuid
from typing import Optional
import mysql.connector
import mysql.connector
from mysql.connector import pooling
import datetime

# Setup logging
import tempfile
log_file = Path(tempfile.gettempdir()) / "ocr_debug.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file)
    ]
)
logger = logging.getLogger(__name__)
logger.info(f"Logging to {log_file}")

# Add project root and module paths
docroot = Path(__file__).resolve().parent
os.chdir(str(docroot))
sys.path.insert(0, str(docroot))
sys.path.insert(0, str(docroot / 'scripts'))

logger.info(f"Working directory: {docroot}")
logger.info(f"Scripts path: {docroot / 'scripts'}")

# Preload preprocess module
try:
    import importlib.util
    preprocess_path = docroot / 'preprocess.py'
    if preprocess_path.exists():
        spec = importlib.util.spec_from_file_location('preprocess', str(preprocess_path))
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        sys.modules['preprocess'] = module
        logger.info("Loaded preprocess module")
except Exception as e:
    logger.warning(f"Could not load preprocess module: {e}")

# Preload OCR module to verify API key on startup
try:
    from scripts import ocr
    logger.info(f"OCR module loaded - client available: {ocr.client is not None}")
except Exception as e:
    logger.error(f"Failed to load OCR module: {e}")

# Load pipeline module
init_error = None
try:
    import importlib.util
    pipeline_path = docroot / 'pipeline.py'
    spec = importlib.util.spec_from_file_location('pipeline_main', str(pipeline_path))
    pipeline_module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(pipeline_module)
    MarksheetProcessor = getattr(pipeline_module, 'MarksheetProcessor')
    logger.info("Loaded pipeline module with MarksheetProcessor")
except Exception as e:
    logger.warning(f"Could not load pipeline: {e}")
    init_error = str(e)
    MarksheetProcessor = None

# =====================================================
# MySQL Database Configuration
# =====================================================

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'aditya',  # Update with your MySQL password
    'database': 'connect_college'
}

db_pool = None
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="ocr_pool",
        pool_size=5,
        **DB_CONFIG
    )
    print("✅ Connected to MySQL database: connect_college")
except Exception as e:
    print(f"⚠️ Warning: Could not connect to MySQL: {e}")

def get_db_connection():
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    return db_pool.get_connection()

# =====================================================
# Pydantic Models
# =====================================================

class UserCreate(BaseModel):
    username: str
    email: str

class SubmitData(BaseModel):
    user_email: str
    marksheets: list

# =====================================================
# FastAPI App Setup
# =====================================================

UPLOAD_DIR = docroot / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="DOC OC API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

processor = MarksheetProcessor() if MarksheetProcessor else None

# =====================================================
# API Endpoints
# =====================================================

@app.get("/")
async def root():
    return {"message": "DOC OC API is running", "status": "ok"}

@app.post("/process")
async def process_marksheet(
    file: UploadFile = File(...),
    mode: str = Query("school"),
    expected_sem: Optional[str] = Query(None),
):
    """Process a marksheet image and extract data using OCR"""
    logger.info(f"Received /process request. File: {file.filename}, Mode: {mode}")
    if processor is None:
        logger.error(f"OCR processor not initialized. Error: {init_error}")
        raise HTTPException(status_code=500, detail=f"OCR processor not available. Init error: {init_error}")
    
    suffix = Path(file.filename).suffix
    
    # Create meaningful filename: YYYYMMDD_HHMMSS_OriginalName.ext
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    # Sanitize original filename (alphanumeric, dots, dashes, underscores)
    clean_name = "".join(c for c in Path(file.filename).stem if c.isalnum() or c in "._- ")[:30].replace(" ", "_")
    if not clean_name:
        clean_name = "upload"
        
    temp_filename = f"{timestamp}_{clean_name}{suffix}"
    temp_path = UPLOAD_DIR / temp_filename
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # PDF to image conversion
    # PDF to image conversion
    if suffix.lower() == ".pdf":
        try:
            import fitz  # PyMuPDF
            logger.info(f"Converting PDF to image: {temp_path}")
            doc = fitz.open(temp_path)
            if doc.page_count < 1:
                raise ValueError("Empty PDF")
            page = doc.load_page(0)  # First page
            pix = page.get_pixmap(dpi=300)
            
            # New filename
            img_path = UPLOAD_DIR / f"{Path(temp_filename).stem}.jpg"
            pix.save(str(img_path))
            doc.close()
            
            # Cleanup PDF
            try:
                os.remove(temp_path)
            except Exception:
                pass
            
            temp_path = img_path
            logger.info(f"PDF converted successfully to: {temp_path}")
            
        except Exception as e:
            logger.error(f"Failed to convert PDF: {e}")
            raise HTTPException(status_code=400, detail=f"PDF conversion failed: {str(e)}")
    
    try:
        # Create a persistent display copy for UI (in case pipeline deletes original)
        display_filename = f"{Path(temp_path).stem}_display{Path(temp_path).suffix}"
        display_path = UPLOAD_DIR / display_filename
        shutil.copy(temp_path, display_path)

        if mode == "college":
            from scripts.college_extractor import process_fixed_format as college_process
            info_box = (0.395423, 0.163709, 0.653978, 0.128660)
            marks_box = (0.492943, 0.472937, 0.849016, 0.492458)
            data = college_process(str(temp_path), info_box, marks_box)
            
            if expected_sem:
                try:
                    extracted_sem = (data.get("college", {}) or {}).get("semester")
                    if extracted_sem and str(extracted_sem).strip().upper() != str(expected_sem).strip().upper():
                        return JSONResponse(
                            content={"error": f"Uploaded marksheet belongs to Semester {extracted_sem}. Please upload Semester {expected_sem} marksheet."},
                            status_code=400
                        )
                except Exception:
                    pass
            return JSONResponse(content={"board": "COLLEGE_FIXED", "data": data, "server_filename": display_filename})
        else:
            result = processor.process_single_marksheet(str(temp_path))
            data = None
            if 'extraction' in result:
                data = result['extraction'].get('data')
                if not data and result['extraction'].get('final_json'):
                    final_json_path = Path(result['extraction']['final_json'])
                    if final_json_path.exists():
                        import json
                        with open(final_json_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
            if data is not None:
                return JSONResponse(content={
                    "board": result.get("logo_detection", {}).get("board_name", ""), 
                    "data": data,
                    "server_filename": display_filename
                })
            else:
                board_name = result.get("logo_detection", {}).get("board_name", "")
                return JSONResponse(content={
                    "server_filename": display_filename,
                    "board": board_name,
                    "data": {
                        "board": board_name,
                        "student_name": "OCR not available",
                        "subjects": [],
                        "note": "OCR extraction failed"
                    }
                })
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

@app.post("/create_user")
async def create_user(user: UserCreate):
    """Create a new user"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Check if user exists
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create user with default password
        cursor.execute("""
            INSERT INTO users (email, password_hash, full_name, role)
            VALUES (%s, %s, %s, 'STUDENT')
        """, (user.email, '$2a$10$defaulthash', user.username))
        conn.commit()
        
        return {"user_id": cursor.lastrowid, "message": "User created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/user/{email}")
async def get_user(email: str):
    """Get user by email"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT user_id, email, full_name, role FROM users WHERE email = %s
        """, (email,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    finally:
        cursor.close()
        conn.close()

@app.post("/submit_marksheets")
async def submit_marksheets(data: SubmitData):
    """Submit extracted marksheet data to database with full schema support"""
    import json as json_lib
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get user by email
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (data.user_email,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user['user_id']
        saved_count = 0
        
        for ms in data.marksheets:
            filename = ms.get("filename", "")
            ms_data = ms.get("data", {})
            board = ms.get("board", ms_data.get("board", "OTHER")).upper()
            
            # Determine semester and marksheet type
            type_id = ms.get("type_identifier")
            semester = 0
            marksheet_type = "OTHER"
            
            if type_id == "10TH":
                semester = 10
                marksheet_type = "10TH"
            elif type_id == "12TH":
                semester = 12
                marksheet_type = "12TH"
            elif type_id == "SEMESTER":
                marksheet_type = "SEMESTER"
                semester = int(ms.get("semester_override", 0))
            else:
                # Fallback to filename logic (legacy)
                if "10th" in filename.lower():
                    semester = 10
                    marksheet_type = "10TH"
                elif "12th" in filename.lower():
                    semester = 12
                    marksheet_type = "12TH"
                else:
                    import re
                    match = re.search(r'semester_(\d+)', filename.lower())
                    if match:
                        semester = int(match.group(1))
                        marksheet_type = "SEMESTER"
            
            if semester == 0:
                continue
            
            # Normalize board type for DB enum
            board_type = "OTHER"
            if "CBSE" in board:
                board_type = "CBSE"
            elif "ICSE" in board:
                board_type = "ICSE"
            elif "UTTARAKHAND" in board or "UK" in board:
                board_type = "UTTARAKHAND"
            elif "COLLEGE" in board:
                board_type = "COLLEGE"
            
            # Extract student metadata based on board type
            student_name = ms_data.get("student_name") or (ms_data.get("student", {}) or {}).get("name")
            roll_number = ms_data.get("roll_number") or ms_data.get("unique_id") or (ms_data.get("student", {}) or {}).get("roll_no")
            enrollment_number = (ms_data.get("student", {}) or {}).get("enrollment_no")
            father_name = ms_data.get("father_name") or (ms_data.get("student", {}) or {}).get("father_name")
            mother_name = ms_data.get("mother_name")
            school_name = ms_data.get("school_name")
            school_code = ms_data.get("school_code")
            course_name = (ms_data.get("college", {}) or {}).get("course")
            session = (ms_data.get("college", {}) or {}).get("session")
            
            # Insert upload record with all new columns
            cursor.execute("""
                INSERT INTO marksheet_uploads 
                (user_id, semester, board_type, marksheet_type, student_name_extracted, 
                 roll_number, enrollment_number, father_name, mother_name, school_name, 
                 school_code, course_name, session, image_url, raw_json_data, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'VERIFICATION_PENDING')
            """, (
                user_id, semester, board_type, marksheet_type, student_name,
                roll_number, enrollment_number, father_name, mother_name, school_name,
                school_code, course_name, session, filename, json_lib.dumps(ms_data)
            ))
            upload_id = cursor.lastrowid
            
            # Insert extracted marks with all breakdown fields
            subjects = ms_data.get("subjects", [])
            for subj in subjects:
                cursor.execute("""
                    INSERT INTO extracted_marks 
                    (upload_id, subject_name_raw, subject_code, marks_obtained, marks_total,
                     theory_marks, practical_marks, internal_marks, external_marks,
                     credits, grade, grade_point, marks_in_words, confidence_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    upload_id,
                    subj.get("name", subj.get("subject_name", "Unknown")),
                    subj.get("code"),
                    subj.get("total_marks") or subj.get("marks") or subj.get("total"),
                    subj.get("max_marks", 100),
                    subj.get("theory_marks"),
                    subj.get("practical_marks"),
                    subj.get("internal_marks"),
                    subj.get("external_marks"),
                    subj.get("credits"),
                    subj.get("grade"),
                    subj.get("grade_point"),
                    subj.get("marks_in_words") or subj.get("total_in_words"),
                    0.9
                ))
            
            # For college marksheets, save semester results (SGPA, CGPA)
            if board_type == "COLLEGE":
                result_data = ms_data.get("result", {})
                if result_data:
                    cursor.execute("""
                        INSERT INTO semester_results 
                        (upload_id, total_credits_registered, total_credits_earned, sgpa, cgpa, result_status)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        upload_id,
                        result_data.get("total_credits_registered"),
                        result_data.get("total_credits_earned"),
                        result_data.get("sgpa"),
                        result_data.get("cgpa"),
                        result_data.get("status")
                    ))
            
            saved_count += 1
        
        conn.commit()
        return {"message": f"Successfully saved {saved_count} marksheets", "saved_count": saved_count}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/user_marksheets/{email}")
async def get_user_marksheets(email: str):
    """Get all marksheets for a user with full data"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        logger.info(f"Fetching marksheets for email: {email}")
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            logger.warning(f"User not found for request: {email}")
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Found user_id: {user['user_id']} for email: {email}")

        cursor.execute("""
            SELECT upload_id, semester, board_type, marksheet_type, student_name_extracted,
                   roll_number, enrollment_number, father_name, mother_name, school_name,
                   school_code, course_name, session, academic_year, image_url, status,
                   uploaded_at, verified_at, admin_comment
            FROM marksheet_uploads
            WHERE user_id = %s
            ORDER BY semester ASC
        """, (user['user_id'],))
        marksheets = cursor.fetchall()
        logger.info(f"Retrieved {len(marksheets)} marksheets from DB")
        
        for ms in marksheets:
            # Get extracted marks with all breakdown fields
            cursor.execute("""
                SELECT mark_id, subject_name_raw, subject_code, marks_obtained, marks_total,
                       theory_marks, practical_marks, internal_marks, external_marks,
                       credits, grade, grade_point, marks_in_words, confidence_score, is_corrected_by_user
                FROM extracted_marks
                WHERE upload_id = %s
            """, (ms['upload_id'],))
            ms['marks'] = cursor.fetchall()
            
            # For college marksheets, get semester results
            if ms.get('board_type') == 'COLLEGE':
                cursor.execute("""
                    SELECT total_credits_registered, total_credits_earned, sgpa, cgpa, result_status
                    FROM semester_results WHERE upload_id = %s
                """, (ms['upload_id'],))
                result = cursor.fetchone()
                ms['semester_result'] = result
        
        return {"marksheets": marksheets}
        
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/marksheets/pending")
async def get_pending_marksheets():
    """Get all marksheets pending verification (Admin)"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT mu.*, u.full_name, u.email
            FROM marksheet_uploads mu
            JOIN users u ON mu.user_id = u.user_id
            WHERE mu.status = 'VERIFICATION_PENDING'
            ORDER BY mu.uploaded_at ASC
        """)
        marksheets = cursor.fetchall()
        
        for ms in marksheets:
            cursor.execute("""
                SELECT * FROM extracted_marks WHERE upload_id = %s
            """, (ms['upload_id'],))
            ms['marks'] = cursor.fetchall()
        
        return {"pending_marksheets": marksheets}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/admin/marksheets/{upload_id}/verify")
async def verify_marksheet(upload_id: int, status: str = Query(...), admin_id: int = Query(...), comment: Optional[str] = Query(None)):
    """Approve or reject a marksheet (Admin)"""
    if status not in ['APPROVED', 'REJECTED']:
        raise HTTPException(status_code=400, detail="Status must be APPROVED or REJECTED")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            UPDATE marksheet_uploads 
            SET status = %s, verified_at = NOW(), verified_by = %s, admin_comment = %s
            WHERE upload_id = %s
        """, (status, admin_id, comment, upload_id))
        conn.commit()
        
        return {"message": f"Marksheet {status.lower()}", "upload_id": upload_id}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/marksheets/history")
async def get_verification_history():
    """Get all verified/rejected marksheets (Admin history)"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT mu.*, u.full_name, u.email, v.full_name as verifier_name
            FROM marksheet_uploads mu
            JOIN users u ON mu.user_id = u.user_id
            LEFT JOIN users v ON mu.verified_by = v.user_id
            WHERE mu.status IN ('APPROVED', 'REJECTED')
            ORDER BY mu.verified_at DESC
            LIMIT 100
        """)
        marksheets = cursor.fetchall()
        return {"history": marksheets}
    finally:
        cursor.close()
        conn.close()

# =====================================================
# Student Request Endpoints
# =====================================================

class StudentRequest(BaseModel):
    upload_id: int
    user_email: str
    request_type: str  # 'REUPLOAD' or 'CORRECTION'
    message: Optional[str] = None
    correction_data: Optional[dict] = None

@app.post("/api/student/request")
async def submit_student_request(request: StudentRequest):
    """Submit a re-upload or correction request from student"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get user id
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (request.user_email,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update marksheet with request info
        # Using admin_comment field to store pending request (will be overwritten when admin acts)
        request_note = f"[STUDENT REQUEST: {request.request_type}] {request.message or 'No message'}"
        
        # Set status to indicate request is pending
        new_status = 'VERIFICATION_PENDING'
        
        # If correction request, store the correction data in raw_json_data for admin review
        if request.correction_data:
            import json
            correction_json = json.dumps(request.correction_data)
            cursor.execute("""
                UPDATE marksheet_uploads 
                SET status = %s, admin_comment = %s, raw_json_data = %s
                WHERE upload_id = %s AND user_id = %s
            """, (new_status, request_note, correction_json, request.upload_id, user['user_id']))
        else:
            cursor.execute("""
                UPDATE marksheet_uploads 
                SET status = %s, admin_comment = %s
                WHERE upload_id = %s AND user_id = %s
            """, (new_status, request_note, request.upload_id, user['user_id']))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Marksheet not found or not owned by user")
        
        conn.commit()
        return {"message": "Request submitted successfully", "upload_id": request.upload_id}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/requests/pending")
async def get_pending_requests():
    """Get all marksheets with pending student requests"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT mu.*, u.full_name, u.email
            FROM marksheet_uploads mu
            JOIN users u ON mu.user_id = u.user_id
            WHERE mu.admin_comment LIKE '[STUDENT REQUEST:%'
            ORDER BY mu.uploaded_at DESC
        """)
        requests = cursor.fetchall()
        return {"pending_requests": requests}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/admin/requests/{upload_id}/handle")
async def handle_student_request(upload_id: int, action: str = Query(...), admin_id: int = Query(...), comment: Optional[str] = Query(None)):
    """Admin handles a student request - approve or deny"""
    if action not in ['APPROVE_REUPLOAD', 'DENY']:
        raise HTTPException(status_code=400, detail="Action must be APPROVE_REUPLOAD or DENY")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        if action == 'APPROVE_REUPLOAD':
            # Allow student to re-upload by setting status back to processing
            cursor.execute("""
                UPDATE marksheet_uploads 
                SET status = 'PROCESSING', admin_comment = %s, verified_at = NOW(), verified_by = %s
                WHERE upload_id = %s
            """, (f"Re-upload approved. {comment or ''}", admin_id, upload_id))
        else:
            # Deny the request
            cursor.execute("""
                UPDATE marksheet_uploads 
                SET status = 'APPROVED', admin_comment = %s, verified_at = NOW(), verified_by = %s
                WHERE upload_id = %s
            """, (f"Request denied. {comment or ''}", admin_id, upload_id))
        
        conn.commit()
        return {"message": f"Request {action.lower()}", "upload_id": upload_id}
    finally:
        cursor.close()
        conn.close()


# =====================================================
# Run Server
# =====================================================

if __name__ == "__main__":
    import uvicorn
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    args = parser.parse_args()
    
    uvicorn.run("main:app", host=args.host, port=args.port, reload=True)