-- ============================================================
-- _DATABASEsruttura_.sql
-- Schema completo Garage ANPR Management System
-- Versione: 2.0 - Aprile 2026
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- DATABASE
-- ============================================================
CREATE DATABASE IF NOT EXISTS `garage_anpr`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `garage_anpr`;

-- ============================================================
-- 1. TABELLA: plates
--    Registro targhe riconosciute dall'ANPR
-- ============================================================
CREATE TABLE IF NOT EXISTS `plates` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_number`  VARCHAR(10)     NOT NULL COMMENT 'Numero di targa (es. AB123CD)',
    `type`          ENUM('transit','subscription','authorized') NOT NULL DEFAULT 'transit',
    `brand`         VARCHAR(50)     DEFAULT NULL,
    `model`         VARCHAR(50)     DEFAULT NULL,
    `color`         VARCHAR(30)     DEFAULT NULL,
    `ticket_code`   VARCHAR(20)     DEFAULT NULL COMMENT 'Codice ticket corrente (shortcut)',
    `notes`         TEXT            DEFAULT NULL,
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_plate_number` (`plate_number`),
    KEY `idx_type` (`type`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro targhe veicoli';

-- ============================================================
-- 2. TABELLA: passages
--    Ogni ingresso/uscita dal garage
-- ============================================================
CREATE TABLE IF NOT EXISTS `passages` (
    `id`             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_id`       INT UNSIGNED    DEFAULT NULL COMMENT 'NULL = ticket standalone senza targa riconosciuta',
    `entry_datetime` DATETIME        DEFAULT NULL,
    `entry_image`    VARCHAR(255)    DEFAULT NULL COMMENT 'Percorso immagine ANPR ingresso',
    `exit_datetime`  DATETIME        DEFAULT NULL,
    `exit_image`     VARCHAR(255)    DEFAULT NULL COMMENT 'Percorso immagine ANPR uscita',
    `info`           VARCHAR(255)    DEFAULT NULL COMMENT 'Info aggiuntive (es. Ticket manuale)',
    `paid`           TINYINT(1)      NOT NULL DEFAULT 0,
    `notes`          TEXT            DEFAULT NULL,
    `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_id`       (`plate_id`),
    KEY `idx_entry_datetime` (`entry_datetime`),
    KEY `idx_exit_datetime`  (`exit_datetime`),
    CONSTRAINT `fk_passages_plate`
        FOREIGN KEY (`plate_id`) REFERENCES `plates` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Passaggi (ingresso/uscita) nel garage';

-- ============================================================
-- 3. TABELLA: tickets
--    Ticket emessi per ogni passaggio
-- ============================================================
CREATE TABLE IF NOT EXISTS `tickets` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `passage_id`  INT UNSIGNED    NOT NULL,
    `ticket_code` VARCHAR(20)     NOT NULL,
    `amount`      DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `paid`        TINYINT(1)      NOT NULL DEFAULT 0,
    `notes`       TEXT            DEFAULT NULL,
    `printed_at`  DATETIME        DEFAULT NULL,
    `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ticket_code` (`ticket_code`),
    KEY `idx_passage_id` (`passage_id`),
    KEY `idx_paid`       (`paid`),
    CONSTRAINT `fk_tickets_passage`
        FOREIGN KEY (`passage_id`) REFERENCES `passages` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ticket emessi per i passaggi';

-- ============================================================
-- 4. TABELLA: subscriptions
--    Abbonamenti associati a targhe
-- ============================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_id`   INT UNSIGNED    NOT NULL,
    `type`       VARCHAR(50)     NOT NULL DEFAULT 'mensile',
    `start_date` DATE            NOT NULL,
    `end_date`   DATE            NOT NULL,
    `active`     TINYINT(1)      NOT NULL DEFAULT 1,
    `notes`      TEXT            DEFAULT NULL,
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_id`  (`plate_id`),
    KEY `idx_end_date`  (`end_date`),
    KEY `idx_active`    (`active`),
    CONSTRAINT `fk_subscriptions_plate`
        FOREIGN KEY (`plate_id`) REFERENCES `plates` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Abbonamenti mensili/annuali';

-- ============================================================
-- 5. TABELLA: prepaid_cards
--    Tessere a scalare
-- ============================================================
CREATE TABLE IF NOT EXISTS `prepaid_cards` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_id`    INT UNSIGNED    NOT NULL,
    `code`        VARCHAR(30)     NOT NULL,
    `balance`     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `expiry_date` DATE            DEFAULT NULL,
    `active`      TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_code` (`code`),
    KEY `idx_plate_id` (`plate_id`),
    CONSTRAINT `fk_prepaid_plate`
        FOREIGN KEY (`plate_id`) REFERENCES `plates` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tessere a scalare';

-- ============================================================
-- 6. TABELLA: plate_authorizations
--    Veicoli autorizzati
-- ============================================================
CREATE TABLE IF NOT EXISTS `plate_authorizations` (
    `id`               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_id`         INT UNSIGNED    NOT NULL,
    `authorized_until` DATETIME        DEFAULT NULL,
    `reason`           VARCHAR(255)    DEFAULT NULL,
    `active`           TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_id` (`plate_id`),
    CONSTRAINT `fk_authorization_plate`
        FOREIGN KEY (`plate_id`) REFERENCES `plates` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Autorizzazioni veicoli';

-- ============================================================
-- 7. TABELLA: audit_log
--    Log operazioni (creato dai trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `table_name` VARCHAR(50)     NOT NULL,
    `record_id`  INT UNSIGNED    NOT NULL,
    `action`     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    `old_data`   JSON            DEFAULT NULL,
    `new_data`   JSON            DEFAULT NULL,
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_table_record` (`table_name`, `record_id`),
    KEY `idx_created_at`   (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Log audit operazioni';

-- ============================================================
-- TRIGGER: auto-update updated_at for plates
-- ============================================================
DROP TRIGGER IF EXISTS `trg_plates_updated_at`;
DELIMITER $$
CREATE TRIGGER `trg_plates_updated_at`
BEFORE UPDATE ON `plates`
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER: auto-update updated_at for passages
-- ============================================================
DROP TRIGGER IF EXISTS `trg_passages_updated_at`;
DELIMITER $$
CREATE TRIGGER `trg_passages_updated_at`
BEFORE UPDATE ON `passages`
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER: audit log for plates
-- ============================================================
DROP TRIGGER IF EXISTS `trg_plates_audit_insert`;
DELIMITER $$
CREATE TRIGGER `trg_plates_audit_insert`
AFTER INSERT ON `plates`
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_data, created_at)
    VALUES ('plates', NEW.id, 'INSERT',
            JSON_OBJECT(
                'plate_number', NEW.plate_number,
                'type', NEW.type,
                'created_at', NEW.created_at
            ),
            NOW());
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_plates_audit_delete`;
DELIMITER $$
CREATE TRIGGER `trg_plates_audit_delete`
AFTER DELETE ON `plates`
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, created_at)
    VALUES ('plates', OLD.id, 'DELETE',
            JSON_OBJECT('plate_number', OLD.plate_number, 'type', OLD.type),
            NOW());
END$$
DELIMITER ;

-- ============================================================
-- VISTA: v_expired_subscriptions
--    Abbonamenti scaduti con dati targa
-- ============================================================
CREATE OR REPLACE VIEW `v_expired_subscriptions` AS
    SELECT
        s.id,
        s.plate_id,
        p.plate_number,
        s.type,
        s.start_date,
        s.end_date,
        DATEDIFF(CURDATE(), s.end_date) AS days_expired
    FROM subscriptions s
    JOIN plates p ON p.id = s.plate_id
    WHERE s.end_date < CURDATE()
      AND s.active = 1;

-- ============================================================
-- VISTA: v_plates_with_tickets
--    Targhe con i ticket associati
-- ============================================================
CREATE OR REPLACE VIEW `v_plates_with_tickets` AS
    SELECT
        p.id           AS plate_id,
        p.plate_number,
        p.type,
        pg.id          AS passage_id,
        pg.entry_datetime,
        pg.exit_datetime,
        t.ticket_code,
        t.amount,
        t.paid,
        t.created_at   AS ticket_created_at
    FROM plates p
    JOIN passages pg ON pg.plate_id = p.id
    JOIN tickets  t  ON t.passage_id = pg.id
    ORDER BY t.created_at DESC;

-- ============================================================
-- VISTA: v_vehicles_parked
--    Veicoli attualmente in garage (ingresso senza uscita)
-- ============================================================
CREATE OR REPLACE VIEW `v_vehicles_parked` AS
    SELECT
        p.id           AS plate_id,
        p.plate_number,
        p.type,
        pg.id          AS passage_id,
        pg.entry_datetime,
        TIMESTAMPDIFF(MINUTE, pg.entry_datetime, NOW()) AS minutes_parked
    FROM plates p
    JOIN passages pg ON pg.plate_id = p.id
    WHERE pg.entry_datetime IS NOT NULL
      AND pg.exit_datetime IS NULL
    ORDER BY pg.entry_datetime ASC;

-- ============================================================
-- RESET
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;
