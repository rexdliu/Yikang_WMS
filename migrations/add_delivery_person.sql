-- ==============================================
-- 数据库迁移脚本 - 添加交付人功能和ETA
-- 在 RDS MySQL 数据库中运行此脚本
-- ==============================================

-- 1. 创建交付人表 (delivery_persons)
CREATE TABLE IF NOT EXISTS delivery_persons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '交付人姓名',
    phone VARCHAR(20) NOT NULL COMMENT '电话号码',
    email VARCHAR(100) NULL COMMENT '邮箱',
    vehicle_number VARCHAR(20) NULL COMMENT '车牌号',
    destination VARCHAR(200) NULL COMMENT '常用目的地',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否活跃',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_phone (phone),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交付人信息表';

-- ==============================================
-- 简化版本（直接运行以下命令）
-- 如果列已存在会报错，可以忽略继续
-- ==============================================

-- 2. 添加 delivery_person_id 列
ALTER TABLE sales_orders ADD COLUMN delivery_person_id INT NULL;

-- 3. 添加 estimated_arrival_time 列 (ETA 预计到达时间)
ALTER TABLE sales_orders ADD COLUMN estimated_arrival_time DATETIME NULL;

-- 完成！
