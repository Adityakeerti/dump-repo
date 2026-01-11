-- =====================================================
-- Unified Campus Intelligence System
-- Database: connect_college
-- MySQL 8.0+
-- =====================================================

DROP DATABASE IF EXISTS connect_college;
CREATE DATABASE connect_college CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE connect_college;

-- =====================================================
-- 1. CORE IDENTITY & AUTHENTICATION MODULE
-- =====================================================

-- Main Users Table (For all user types)
CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('STUDENT', 'ADMIN', 'FACULTY', 'LIBRARIAN', 'MODERATOR') NOT NULL,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- Student Profiles (Extended info for students only)
CREATE TABLE student_profiles (
    profile_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    college_roll_number VARCHAR(50) UNIQUE NOT NULL,
    current_semester INT,
    branch_code VARCHAR(50),
    batch_year YEAR,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_roll_number (college_roll_number),
    INDEX idx_batch_year (batch_year)
) ENGINE=InnoDB;

-- User Sessions (Persistent Login)
CREATE TABLE user_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    context_type VARCHAR(20) NOT NULL,
    token VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- 2. SMART LIBRARY MODULE (Based on pustak_tracker.db)
-- =====================================================

-- Book Categories
CREATE TABLE categories (
    category_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Books Inventory
CREATE TABLE books (
    book_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20),
    barcode_id VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150),
    publisher VARCHAR(100),
    category_id BIGINT,
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    INDEX idx_isbn (isbn),
    INDEX idx_barcode (barcode_id),
    INDEX idx_title (title),
    INDEX idx_author (author)
) ENGINE=InnoDB;

-- Library Transactions (Borrowing)
CREATE TABLE library_transactions (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('ISSUED', 'RETURNED', 'OVERDUE', 'LOST') DEFAULT 'ISSUED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    INDEX idx_user_id (user_id),
    INDEX idx_book_id (book_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB;

-- Library Fines
CREATE TABLE library_fines (
    fine_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATETIME,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES library_transactions(transaction_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_is_paid (is_paid)
) ENGINE=InnoDB;

-- Book Reservations
CREATE TABLE reservations (
    reservation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    status ENUM('PENDING', 'FULFILLED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    INDEX idx_user_id (user_id),
    INDEX idx_book_id (book_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- 3. ACADEMIC MODULE
-- =====================================================

-- Subjects/Courses
CREATE TABLE subjects (
    subject_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    credits INT DEFAULT 3,
    semester INT,
    min_attendance_percent INT DEFAULT 75,
    branch_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subject_code (subject_code),
    INDEX idx_semester (semester)
) ENGINE=InnoDB;

-- Subject Enrollments (Student-Subject mapping)
CREATE TABLE subject_enrollments (
    enrollment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    semester INT NOT NULL,
    academic_year VARCHAR(10),
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    UNIQUE KEY unique_enrollment (user_id, subject_id, semester),
    INDEX idx_user_id (user_id),
    INDEX idx_subject_id (subject_id)
) ENGINE=InnoDB;

-- Attendance Logs
CREATE TABLE attendance_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL,
    marked_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES subject_enrollments(enrollment_id),
    FOREIGN KEY (marked_by) REFERENCES users(user_id),
    UNIQUE KEY unique_attendance (enrollment_id, attendance_date),
    INDEX idx_enrollment_id (enrollment_id),
    INDEX idx_date (attendance_date),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================

-- =====================================================
-- 5. COMMUNICATION & COMMUNITY MODULE
-- =====================================================

-- Per-user notifications (System alerts, fines, dues)
CREATE TABLE user_notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO', -- 'DUE_SOON', 'FINE', 'ISSUED'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB;

-- Notices/Announcements
CREATE TABLE notices (
    notice_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    posted_by BIGINT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    ai_category_tag VARCHAR(50),
    target_audience ENUM('ALL', 'STUDENTS', 'FACULTY', 'SPECIFIC_BRANCH') DEFAULT 'ALL',
    target_branch VARCHAR(50),
    target_semester INT,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (posted_by) REFERENCES users(user_id),
    INDEX idx_posted_by (posted_by),
    INDEX idx_priority (priority),
    INDEX idx_category (ai_category_tag),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Groups (Clubs, Projects, Official)
CREATE TABLE `groups` (
    group_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('OFFICIAL', 'CLUB', 'PROJECT') NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_type (type),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;

-- Group Members
CREATE TABLE group_members (
    member_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('LEADER', 'MEMBER', 'MODERATOR') DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_membership (group_id, user_id),
    INDEX idx_group_id (group_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- =====================================================
-- 5A. CHAT & MESSAGING TABLES
-- =====================================================

-- Friend Requests Table (For connection requests)
CREATE TABLE friend_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_friend_request (sender_id, receiver_id)
) ENGINE=InnoDB;

-- Friendships Table (Accepted connections - bidirectional)
CREATE TABLE friendships (
    friendship_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user1_id BIGINT NOT NULL,
    user2_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user1 (user1_id),
    INDEX idx_user2 (user2_id),
    UNIQUE KEY unique_friendship (user1_id, user2_id),
    CHECK (user1_id < user2_id)
) ENGINE=InnoDB;

-- Group Messages Table (For all messages - private and group)
CREATE TABLE group_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    recipient_id BIGINT,
    chat_room_id BIGINT,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type ENUM('JOIN', 'LEAVE', 'CHAT') DEFAULT 'CHAT',
    reply_to_id BIGINT,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (chat_room_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES group_message(id) ON DELETE SET NULL,
    INDEX idx_sender (sender_id),
    INDEX idx_recipient (recipient_id),
    INDEX idx_chat_room (chat_room_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;

-- =====================================================
-- 4. DOC OC MODULE (OCR & Marksheets)
-- =====================================================

-- Marksheet Uploads (supports CBSE, ICSE, Uttarakhand, College formats)
CREATE TABLE marksheet_uploads (
    upload_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    semester INT NOT NULL,
    board_type ENUM('CBSE', 'ICSE', 'UTTARAKHAND', 'COLLEGE', 'OTHER') DEFAULT 'OTHER',
    marksheet_type ENUM('10TH', '12TH', 'SEMESTER', 'OTHER') DEFAULT 'OTHER',
    student_name_extracted VARCHAR(100),
    roll_number VARCHAR(50),
    enrollment_number VARCHAR(50),
    father_name VARCHAR(100),
    mother_name VARCHAR(100),
    school_name VARCHAR(200),
    school_code VARCHAR(20),
    course_name VARCHAR(200),
    session VARCHAR(20),
    academic_year VARCHAR(10),
    image_url TEXT NOT NULL,
    raw_json_data JSON,
    status ENUM('PROCESSING', 'VERIFICATION_PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PROCESSING',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    verified_by BIGINT,
    admin_comment TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (verified_by) REFERENCES users(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_semester (semester),
    INDEX idx_board_type (board_type)
) ENGINE=InnoDB;

-- Extracted Marks (AI-generated data - supports all board formats)
CREATE TABLE extracted_marks (
    mark_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    upload_id BIGINT NOT NULL,
    subject_name_raw VARCHAR(100),
    subject_code VARCHAR(20),
    subject_id BIGINT,
    marks_obtained FLOAT,
    marks_total FLOAT,
    theory_marks FLOAT,
    practical_marks FLOAT,
    internal_marks FLOAT,
    external_marks FLOAT,
    credits INT,
    grade VARCHAR(10),
    grade_point FLOAT,
    marks_in_words VARCHAR(100),
    confidence_score FLOAT,
    is_corrected_by_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES marksheet_uploads(upload_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    INDEX idx_upload_id (upload_id)
) ENGINE=InnoDB;

-- Semester Results (College-specific aggregates: SGPA, CGPA)
CREATE TABLE semester_results (
    result_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    upload_id BIGINT NOT NULL UNIQUE,
    total_credits_registered INT,
    total_credits_earned INT,
    sgpa FLOAT,
    cgpa FLOAT,
    result_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES marksheet_uploads(upload_id) ON DELETE CASCADE,
    INDEX idx_upload_id (upload_id)
) ENGINE=InnoDB;

-- =====================================================
-- 6. CORRECTION & VERIFICATION SYSTEM
-- =====================================================

-- Correction Requests (For attendance/marks disputes)
CREATE TABLE correction_requests (
    request_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_type ENUM('ATTENDANCE', 'MARKS', 'PROFILE') NOT NULL,
    reference_id BIGINT,
    description TEXT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by BIGINT,
    resolution_comment TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (resolved_by) REFERENCES users(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_type (request_type)
) ENGINE=InnoDB;

-- =====================================================
-- 7. MEETINGS & MENTORSHIP
-- =====================================================

-- Meeting Requests
CREATE TABLE meeting_requests (
    meeting_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requested_by BIGINT NOT NULL,
    requested_to BIGINT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    proposed_datetime DATETIME,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    meeting_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(user_id),
    FOREIGN KEY (requested_to) REFERENCES users(user_id),
    INDEX idx_requested_by (requested_by),
    INDEX idx_requested_to (requested_to),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- 8. AUDIT & SYSTEM LOGS
-- =====================================================

-- Audit Trail (For ERP Admin)
CREATE TABLE audit_logs (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- =====================================================
-- 9. AI RECOMMENDATIONS (Future)
-- =====================================================

-- Book Recommendations
CREATE TABLE book_recommendations (
    recommendation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    score FLOAT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    INDEX idx_user_id (user_id),
    INDEX idx_score (score DESC)
) ENGINE=InnoDB;

-- =====================================================
-- 10. AI CHAT & AGENT MODULE
-- =====================================================

-- Chat Messages (auto-expires after 7 days via application)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    message_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    role ENUM('user', 'chatbot', 'agent') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Agent Tasks
CREATE TABLE IF NOT EXISTS ai_agent_tasks (
    task_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    task_type VARCHAR(50),
    description TEXT,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    result JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- User AI Profiles (preferences, context)
CREATE TABLE IF NOT EXISTS ai_user_profiles (
    user_id VARCHAR(100) PRIMARY KEY,
    preferences JSON,
    context JSON,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@campus.edu', '$2a$10$8K1p/a0dL3.qlh8QKklPieTy/vQvpNhjVUGCcJGsOxwrTkMh/ykwS', 'System Administrator', 'ADMIN'),
('librarian@campus.edu', '$2a$10$8K1p/a0dL3.qlh8QKklPieTy/vQvpNhjVUGCcJGsOxwrTkMh/ykwS', 'Head Librarian', 'LIBRARIAN');

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Engineering', 'Engineering and Technology books'),
('Science', 'Pure and Applied Science'),
('Fiction', 'Novels and Story books'),
('Reference', 'Dictionaries and Reference materials');

-- Insert sample subjects
INSERT INTO subjects (subject_code, subject_name, credits, semester, branch_code) VALUES
('CS301', 'Data Structures', 4, 3, 'CSE'),
('CS302', 'Database Management Systems', 4, 3, 'CSE'),
('CS303', 'Artificial Intelligence', 3, 5, 'CSE'),
('CS304', 'Web Technologies', 3, 5, 'CSE'),
('MA201', 'Engineering Mathematics', 4, 2, 'ALL');

-- Insert default groups
INSERT INTO `groups` (name, type, description, created_by) VALUES
('Default College', 'OFFICIAL', 'All students group', 1),
('Coding Club', 'CLUB', 'For programming enthusiasts', 1);

-- =====================================================
-- USEFUL VIEWS
-- =====================================================

-- Student Dashboard View
CREATE VIEW v_student_dashboard AS
SELECT 
    u.user_id,
    u.full_name,
    sp.college_roll_number,
    sp.current_semester,
    sp.branch_code,
    (SELECT COUNT(*) FROM library_transactions lt 
     WHERE lt.user_id = u.user_id AND lt.status = 'ISSUED') as active_books,
    (SELECT COALESCE(SUM(lf.amount), 0) FROM library_fines lf 
     JOIN library_transactions lt ON lf.transaction_id = lt.transaction_id
     WHERE lt.user_id = u.user_id AND lf.is_paid = FALSE) as pending_fines
FROM users u
LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
WHERE u.role = 'STUDENT' AND u.is_active = TRUE;

-- Overdue Books View
CREATE VIEW v_overdue_books AS
SELECT 
    lt.transaction_id,
    u.full_name as student_name,
    u.email,
    sp.college_roll_number,
    b.title as book_title,
    lt.issue_date,
    lt.due_date,
    DATEDIFF(CURRENT_DATE, lt.due_date) as days_overdue,
    lt.fine_amount
FROM library_transactions lt
JOIN users u ON lt.user_id = u.user_id
JOIN student_profiles sp ON u.user_id = sp.user_id
JOIN books b ON lt.book_id = b.book_id
WHERE lt.status IN ('ISSUED', 'OVERDUE') 
  AND lt.due_date < CURRENT_DATE;

-- Subject Attendance Summary View
CREATE VIEW v_attendance_summary AS
SELECT 
    se.enrollment_id,
    u.full_name as student_name,
    sp.college_roll_number,
    s.subject_code,
    s.subject_name,
    COUNT(al.log_id) as total_classes,
    SUM(CASE WHEN al.status = 'PRESENT' THEN 1 ELSE 0 END) as classes_attended,
    ROUND((SUM(CASE WHEN al.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(al.log_id)) * 100, 2) as attendance_percentage,
    s.min_attendance_percent,
    CASE 
        WHEN ROUND((SUM(CASE WHEN al.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(al.log_id)) * 100, 2) >= s.min_attendance_percent 
        THEN 'SAFE' 
        ELSE 'DANGER' 
    END as status
FROM subject_enrollments se
JOIN users u ON se.user_id = u.user_id
JOIN student_profiles sp ON u.user_id = sp.user_id
JOIN subjects s ON se.subject_id = s.subject_id
LEFT JOIN attendance_logs al ON se.enrollment_id = al.enrollment_id
GROUP BY se.enrollment_id, u.full_name, sp.college_roll_number, s.subject_code, s.subject_name, s.min_attendance_percent;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

DELIMITER //

-- Procedure to calculate overdue fines
CREATE PROCEDURE calculate_overdue_fines()
BEGIN
    UPDATE library_transactions lt
    SET 
        fine_amount = DATEDIFF(CURRENT_DATE, lt.due_date) * 5.00,
        status = 'OVERDUE'
    WHERE lt.status = 'ISSUED'
      AND lt.due_date < CURRENT_DATE;
END//

-- Procedure to issue a book
CREATE PROCEDURE issue_book(
    IN p_user_id BIGINT,
    IN p_book_id BIGINT,
    IN p_days INT
)
BEGIN
    DECLARE v_available_copies INT;
    
    -- Check book availability
    SELECT available_copies INTO v_available_copies
    FROM books WHERE book_id = p_book_id;
    
    IF v_available_copies > 0 THEN
        -- Create transaction
        INSERT INTO library_transactions (user_id, book_id, due_date)
        VALUES (p_user_id, p_book_id, DATE_ADD(NOW(), INTERVAL p_days DAY));
        
        -- Update book availability
        UPDATE books 
        SET available_copies = available_copies - 1
        WHERE book_id = p_book_id;
        
        SELECT 'Book issued successfully' as message;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Book not available';
    END IF;
END//

-- Procedure to return a book
CREATE PROCEDURE return_book(
    IN p_transaction_id BIGINT
)
BEGIN
    DECLARE v_book_id BIGINT;
    DECLARE v_due_date DATETIME;
    DECLARE v_fine DECIMAL(10,2);
    
    -- Get transaction details
    SELECT book_id, due_date INTO v_book_id, v_due_date
    FROM library_transactions
    WHERE transaction_id = p_transaction_id;
    
    -- Calculate fine
    IF CURRENT_DATE > v_due_date THEN
        SET v_fine = DATEDIFF(CURRENT_DATE, v_due_date) * 5.00;
    ELSE
        SET v_fine = 0.00;
    END IF;
    
    -- Update transaction
    UPDATE library_transactions
    SET return_date = NOW(),
        fine_amount = v_fine,
        status = 'RETURNED'
    WHERE transaction_id = p_transaction_id;
    
    -- Update book availability
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = v_book_id;
    
    -- Create fine record if applicable
    IF v_fine > 0 THEN
        INSERT INTO library_fines (transaction_id, amount)
        VALUES (p_transaction_id, v_fine);
    END IF;
    
    SELECT 'Book returned successfully' as message, v_fine as fine_amount;
END//

DELIMITER ;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_student_semester ON subject_enrollments(user_id, semester);
CREATE INDEX idx_transaction_status_date ON library_transactions(status, due_date);
CREATE INDEX idx_notice_target ON notices(target_audience, target_branch, target_semester);

-- =====================================================
-- DATABASE CREATION COMPLETE
-- =====================================================

SELECT '✅ Database connect_college created successfully!' as Status;
SELECT '📊 Total Tables Created:', COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'connect_college' AND table_type = 'BASE TABLE';
