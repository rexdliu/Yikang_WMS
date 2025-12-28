-- 创建报告表
-- 运行此 SQL 在数据库中创建 reports 和 ai_insights 表

-- 报告表
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER NOT NULL AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    query TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    status ENUM('generating', 'completed', 'failed') DEFAULT 'generating',
    error_message TEXT,
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_reports_user_id (user_id),
    INDEX idx_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 洞察表
CREATE TABLE IF NOT EXISTS ai_insights (
    id INTEGER NOT NULL AUTO_INCREMENT,
    user_id INTEGER,
    type ENUM('suggestion', 'trend', 'warning') NOT NULL,
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_product_id INTEGER,
    related_warehouse_id INTEGER,
    is_handled BOOLEAN DEFAULT FALSE,
    handled_at DATETIME,
    handled_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (related_product_id) REFERENCES products (id) ON DELETE SET NULL,
    FOREIGN KEY (related_warehouse_id) REFERENCES warehouses (id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_insights_user_id (user_id),
    INDEX idx_insights_is_handled (is_handled),
    INDEX idx_insights_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 完成
SELECT 'Tables created successfully!' as message;
