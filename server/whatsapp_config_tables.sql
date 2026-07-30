CREATE TABLE IF NOT EXISTS `whatsapp_channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `url` varchar(1024) NOT NULL,
  `token` text NOT NULL,
  `webhook_provider` varchar(20) NOT NULL DEFAULT 'zpro',
  `prioridade` int NOT NULL DEFAULT '1',
  `ativo` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `whatsapp_watchdog_state` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_id` int DEFAULT NULL,
  `channel_name` varchar(255) NOT NULL,
  `scope_origin` varchar(255) NOT NULL,
  `scope_api_id` varchar(128) NOT NULL,
  `session_id` int DEFAULT NULL,
  `session_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(40) DEFAULT NULL,
  `status` varchar(64) NOT NULL,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_change_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_error` text,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_watchdog_state_identity` (`channel_name`,`scope_origin`,`scope_api_id`),
  UNIQUE KEY `uk_watchdog_state_channel` (`channel_id`),
  KEY `idx_watchdog_state_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `whatsapp_watchdog_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `channel_id` int DEFAULT NULL,
  `channel_name` varchar(255) NOT NULL,
  `scope_origin` varchar(255) NOT NULL,
  `scope_api_id` varchar(128) NOT NULL,
  `session_id` int DEFAULT NULL,
  `session_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(40) DEFAULT NULL,
  `status` varchar(64) DEFAULT NULL,
  `event_type` varchar(40) NOT NULL,
  `message` varchar(1024) NOT NULL,
  `details_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_watchdog_log_channel` (`channel_id`),
  KEY `idx_watchdog_log_created` (`created_at`),
  KEY `idx_watchdog_log_event_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
