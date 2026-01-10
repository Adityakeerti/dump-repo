-- =====================================================
-- AI Chat Memory Tables
-- For Agent1 AI Chatbot Integration
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

-- Cleanup event: Remove messages older than 7 days (run manually or via scheduled task)
-- DELETE FROM ai_chat_messages WHERE created_at < NOW() - INTERVAL 7 DAY;
