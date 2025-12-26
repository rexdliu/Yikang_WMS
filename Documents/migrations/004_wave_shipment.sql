-- =============================================
-- Wave Batching & TMS 数据库迁移脚本
-- 创建时间: 2024-12-10
-- =============================================

-- 1. 创建 waves 表 (波次管理)
CREATE TABLE IF NOT EXISTS waves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wave_code VARCHAR(50) NOT NULL UNIQUE,
    carrier VARCHAR(100),
    region VARCHAR(100),
    warehouse_id INT,
    order_count INT DEFAULT 0,
    total_quantity INT DEFAULT 0,
    priority ENUM('normal', 'urgent') DEFAULT 'normal',
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wave_code (wave_code),
    INDEX idx_wave_status (status),
    INDEX idx_wave_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 创建 shipments 表 (运输单管理)
CREATE TABLE IF NOT EXISTS shipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shipment_code VARCHAR(50) NOT NULL UNIQUE,
    delivery_person_id INT,
    origin_warehouse_id INT NOT NULL,
    origin_address VARCHAR(500),
    origin_lat DECIMAL(10, 7),
    origin_lng DECIMAL(10, 7),
    destination_address VARCHAR(500) NOT NULL,
    destination_lat DECIMAL(10, 7),
    destination_lng DECIMAL(10, 7),
    departure_time TIMESTAMP NULL,
    estimated_arrival TIMESTAMP NULL,
    actual_arrival TIMESTAMP NULL,
    total_distance DECIMAL(10, 2),
    eta_minutes INT,
    status ENUM('planned', 'loading', 'in_transit', 'delivered', 'cancelled') DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_person_id) REFERENCES delivery_persons(id) ON DELETE SET NULL,
    FOREIGN KEY (origin_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    INDEX idx_shipment_code (shipment_code),
    INDEX idx_shipment_status (status),
    INDEX idx_shipment_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 为 sales_orders 表添加 wave_id 和 shipment_id 字段
ALTER TABLE sales_orders 
ADD COLUMN wave_id INT NULL AFTER notes,
ADD COLUMN shipment_id INT NULL AFTER wave_id,
ADD CONSTRAINT fk_order_wave FOREIGN KEY (wave_id) REFERENCES waves(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_order_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL,
ADD INDEX idx_order_wave (wave_id),
ADD INDEX idx_order_shipment (shipment_id);

-- =============================================
-- 验证脚本
-- =============================================
-- 运行以下命令验证表是否创建成功:
-- SHOW TABLES LIKE 'waves';
-- SHOW TABLES LIKE 'shipments';
-- DESCRIBE waves;
-- DESCRIBE shipments;
-- SHOW COLUMNS FROM sales_orders LIKE 'wave_id';
-- SHOW COLUMNS FROM sales_orders LIKE 'shipment_id';
