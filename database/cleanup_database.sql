-- ====================================================
-- DATABASE CLEANUP SCRIPT - CORRECTED
-- Cleans all tables EXCEPT books and library-related tables
-- Database: connect_college
-- ====================================================

USE connect_college;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================
-- CHAT & MESSAGING TABLES
-- ====================================================

-- Clear group messages (note: singular 'group_message')
TRUNCATE TABLE group_message;

-- Clear AI chat messages
TRUNCATE TABLE ai_chat_messages;

-- Clear group memberships
TRUNCATE TABLE group_members;

-- Clear groups
-- Option 1: Delete ALL groups
TRUNCATE TABLE `groups`;

-- Option 2: Keep Default College (id = 1) - UNCOMMENT if needed
-- DELETE FROM `groups` WHERE group_id != 1;

-- ====================================================
-- USER & AUTHENTICATION TABLES
-- ====================================================

-- Clear friend requests
TRUNCATE TABLE friend_requests;

-- Clear friendships
TRUNCATE TABLE friendships;

-- Clear user sessions
TRUNCATE TABLE user_sessions;

-- Clear AI user profiles
TRUNCATE TABLE ai_user_profiles;

-- Clear user notifications
TRUNCATE TABLE user_notifications;

-- Clear users
TRUNCATE TABLE users;

-- ====================================================
-- ACADEMIC & ATTENDANCE TABLES
-- ====================================================

-- Clear attendance logs
TRUNCATE TABLE attendance_logs;

-- Clear student profiles
TRUNCATE TABLE student_profiles;

-- Clear subject enrollments
TRUNCATE TABLE subject_enrollments;

-- Clear subjects
TRUNCATE TABLE subjects;

-- Clear categories
TRUNCATE TABLE categories;

-- Clear notices
TRUNCATE TABLE notices;

-- Clear semester results
TRUNCATE TABLE semester_results;

-- Clear marksheet uploads
TRUNCATE TABLE marksheet_uploads;

-- Clear extracted marks
TRUNCATE TABLE extracted_marks;

-- Clear correction requests
TRUNCATE TABLE correction_requests;

-- ====================================================
-- MEETING & OTHER TABLES
-- ====================================================

-- Clear meeting requests
TRUNCATE TABLE meeting_requests;

-- Clear AI agent tasks
TRUNCATE TABLE ai_agent_tasks;

-- Clear audit logs
TRUNCATE TABLE audit_logs;

-- ====================================================
-- LIBRARY TABLES - KEEP OR CLEAR AS NEEDED
-- ====================================================

-- OPTION 1: Keep ALL library data (RECOMMENDED)
-- Do nothing - books, reservations, transactions, fines are preserved

-- OPTION 2: Clear library transactions but keep books - UNCOMMENT if needed
-- TRUNCATE TABLE library_transactions;
-- TRUNCATE TABLE library_fines;
-- TRUNCATE TABLE reservations;
-- TRUNCATE TABLE book_recommendations;

-- OPTION 3: Clear everything including books - UNCOMMENT if needed
-- TRUNCATE TABLE library_transactions;
-- TRUNCATE TABLE library_fines;
-- TRUNCATE TABLE reservations;
-- TRUNCATE TABLE book_recommendations;
-- TRUNCATE TABLE books;

-- ====================================================
-- Re-enable foreign key checks
-- ====================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================
-- VERIFICATION: Show row counts for main tables
-- ====================================================
SELECT 'group_message' as table_name, COUNT(*) as row_count FROM group_message
UNION ALL SELECT 'ai_chat_messages', COUNT(*) FROM ai_chat_messages
UNION ALL SELECT 'group_members', COUNT(*) FROM group_members
UNION ALL SELECT 'groups', COUNT(*) FROM `groups`
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'friend_requests', COUNT(*) FROM friend_requests
UNION ALL SELECT 'friendships', COUNT(*) FROM friendships
UNION ALL SELECT 'student_profiles', COUNT(*) FROM student_profiles
UNION ALL SELECT 'books', COUNT(*) FROM books
UNION ALL SELECT 'library_transactions', COUNT(*) FROM library_transactions;

-- ====================================================
-- PRESERVED TABLES (Books & Library)
-- ====================================================
-- The following tables are preserved by default:
-- - books
-- - library_transactions
-- - library_fines
-- - reservations
-- - book_recommendations
-- - v_overdue_books (view)
-- - v_student_dashboard (view)
-- - v_attendance_summary (view)
