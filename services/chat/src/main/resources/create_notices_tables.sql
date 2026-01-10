-- SQL Script to create notices tables for backend-chat
-- Run this in your MySQL database: connect_college

-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role VARCHAR(50) NOT NULL,
    group_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_target_role (target_role),
    INDEX idx_group_id (group_id),
    INDEX idx_created_by (created_by),
    INDEX idx_is_active (is_active)
);

-- Create notice_reads table for tracking read status
CREATE TABLE IF NOT EXISTS notice_reads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    notice_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_notice_user (notice_id, user_id),
    INDEX idx_notice_id (notice_id),
    INDEX idx_user_id (user_id),
    
    FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
);

-- Verify tables created
SHOW TABLES LIKE 'notice%';
