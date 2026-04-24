-- ============================================================
-- migration_moduli.sql
-- Database migration for module sections
-- Garage ANPR Management System
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. Base tables (create if not exist)
-- ============================================================
CREATE TABLE IF NOT EXISTS `plates` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_number`  VARCHAR(10)     NOT NULL,
    `tipo`          VARCHAR(50)     DEFAULT NULL,
    `marca`         VARCHAR(100)    DEFAULT NULL,
    `colore`        VARCHAR(50)     DEFAULT NULL,
    `posizione`     VARCHAR(100)    DEFAULT NULL,
    `notev`         TEXT            DEFAULT NULL,
    `autor`         VARCHAR(100)    DEFAULT NULL,
    `ticket_code`   VARCHAR(20)     DEFAULT NULL,
    `notes`         TEXT            DEFAULT NULL,
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_number` (`plate_number`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `passages` (
    `id`             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_id`       INT UNSIGNED    DEFAULT NULL,
    `entry_datetime` DATETIME        DEFAULT NULL,
    `entry_image`    VARCHAR(255)    DEFAULT NULL,
    `exit_datetime`  DATETIME        DEFAULT NULL,
    `exit_image`     VARCHAR(255)    DEFAULT NULL,
    `info`           VARCHAR(255)    DEFAULT NULL,
    `paid`           TINYINT(1)      NOT NULL DEFAULT 0,
    `notes`          TEXT            DEFAULT NULL,
    `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_id`       (`plate_id`),
    KEY `idx_entry_datetime` (`entry_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tickets` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `passage_id`  INT UNSIGNED    DEFAULT NULL,
    `ticket_code` VARCHAR(20)     NOT NULL,
    `amount`      DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `paid`        TINYINT(1)      NOT NULL DEFAULT 0,
    `note`        TEXT            DEFAULT NULL,
    `scal`        INT             DEFAULT NULL COMMENT 'ID tessera a scalare associata',
    `printed_at`  DATETIME        DEFAULT NULL,
    `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ticket_code` (`ticket_code`),
    KEY `idx_passage_id` (`passage_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. ALTER existing plates table (if upgrading)
-- ============================================================
ALTER TABLE `plates`
    ADD COLUMN IF NOT EXISTS `tipo`      VARCHAR(50)  DEFAULT NULL AFTER `plate_number`,
    ADD COLUMN IF NOT EXISTS `marca`     VARCHAR(100) DEFAULT NULL AFTER `tipo`,
    ADD COLUMN IF NOT EXISTS `colore`    VARCHAR(50)  DEFAULT NULL AFTER `marca`,
    ADD COLUMN IF NOT EXISTS `posizione` VARCHAR(100) DEFAULT NULL AFTER `colore`,
    ADD COLUMN IF NOT EXISTS `notev`     TEXT         DEFAULT NULL AFTER `posizione`,
    ADD COLUMN IF NOT EXISTS `autor`     VARCHAR(100) DEFAULT NULL AFTER `notev`;

-- ============================================================
-- 3. ALTER existing tickets table (if upgrading)
-- ============================================================
ALTER TABLE `tickets`
    ADD COLUMN IF NOT EXISTS `note` TEXT DEFAULT NULL AFTER `paid`,
    ADD COLUMN IF NOT EXISTS `scal` INT  DEFAULT NULL AFTER `note`;

-- ============================================================
-- 4. CREATE abbonamenti
-- ============================================================
CREATE TABLE IF NOT EXISTS `abbonamenti` (
    `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `plate_number` VARCHAR(10)     NOT NULL,
    `nome`         VARCHAR(100)    DEFAULT NULL,
    `indirizzo`    VARCHAR(200)    DEFAULT NULL,
    `citta`        VARCHAR(100)    DEFAULT NULL,
    `cap`          VARCHAR(10)     DEFAULT NULL,
    `prov`         VARCHAR(5)      DEFAULT NULL,
    `stato`        VARCHAR(50)     DEFAULT NULL,
    `pi`           VARCHAR(20)     DEFAULT NULL COMMENT 'Partita IVA',
    `cf`           VARCHAR(20)     DEFAULT NULL COMMENT 'Codice Fiscale',
    `codun`        VARCHAR(20)     DEFAULT NULL COMMENT 'Codice Univoco SDI',
    `info`         TEXT            DEFAULT NULL,
    `inabb`        DATE            DEFAULT NULL COMMENT 'Inizio abbonamento',
    `finabb`       DATE            DEFAULT NULL COMMENT 'Fine abbonamento',
    `attivo`       TINYINT(1)      NOT NULL DEFAULT 1,
    `prezzo`       DECIMAL(10,2)   DEFAULT NULL,
    `Apay`         TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Pagato',
    `SpayE`        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Pagato con elettronico',
    `SpayC`        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Pagato con contante',
    `Dpay`         DATETIME        DEFAULT NULL COMMENT 'Data pagamento',
    `tipo_abb`     VARCHAR(50)     DEFAULT NULL COMMENT 'Tipo abbonamento (da costanti)',
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_number` (`plate_number`),
    KEY `idx_finabb`       (`finabb`),
    KEY `idx_attivo`       (`attivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Abbonamenti parcheggio';

-- ============================================================
-- 5. CREATE tesserapre (tessera a scalare prepagata)
-- ============================================================
CREATE TABLE IF NOT EXISTS `tesserapre` (
    `id`           INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT 'Numero tessera',
    `plate_number` VARCHAR(10)     NOT NULL,
    `nome`         VARCHAR(100)    DEFAULT NULL,
    `indirizzo`    VARCHAR(200)    DEFAULT NULL,
    `citta`        VARCHAR(100)    DEFAULT NULL,
    `cap`          VARCHAR(10)     DEFAULT NULL,
    `prov`         VARCHAR(5)      DEFAULT NULL,
    `stato`        VARCHAR(50)     DEFAULT NULL,
    `pi`           VARCHAR(20)     DEFAULT NULL,
    `cf`           VARCHAR(20)     DEFAULT NULL,
    `codun`        VARCHAR(20)     DEFAULT NULL,
    `info`         TEXT            DEFAULT NULL,
    `attivo`       TINYINT(1)      NOT NULL DEFAULT 1,
    `prezzo`       DECIMAL(10,2)   DEFAULT NULL COMMENT 'Importo ultima ricarica',
    `Apay`         TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Pagato',
    `Dpay`         DATETIME        DEFAULT NULL COMMENT 'Data pagamento',
    `SpayE`        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Elettronico',
    `SpayC`        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Contante',
    `canc`         TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Annullata',
    `motivo`       VARCHAR(255)    DEFAULT NULL COMMENT 'Motivo annullamento',
    `fascias`      VARCHAR(100)    DEFAULT NULL COMMENT 'Fascia tariffaria',
    `res1`         DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Residuo',
    `logpay`       TEXT            DEFAULT NULL COMMENT 'Log ricariche: prezzo|Dpay|...',
    `logt`         TEXT            DEFAULT NULL COMMENT 'Storico tessere annullate',
    `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plate_number` (`plate_number`),
    KEY `idx_attivo`       (`attivo`),
    KEY `idx_canc`         (`canc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tessere a scalare prepagata';

SET FOREIGN_KEY_CHECKS = 1;
