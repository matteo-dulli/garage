<?php
/**
 * config.php - Unified application configuration
 * Garage ANPR Management System
 */

// ============================================================
// ENVIRONMENT DETECTION
// ============================================================
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', APP_ENV === 'development');

// ============================================================
// DATABASE CONFIGURATION
// ============================================================
define('DB_HOST',    getenv('DB_HOST')    ?: 'localhost');
define('DB_PORT',    (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME',    getenv('DB_NAME')    ?: 'garage_anpr');
define('DB_USER',    getenv('DB_USER')    ?: 'garage_user');
define('DB_PASS',    getenv('DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8mb4');

// ============================================================
// FILE PATHS
// ============================================================
define('BASE_DIR',        dirname(__DIR__));
define('MONITORED_FOLDER', BASE_DIR . '/anpr_images/');
define('PRINT_DIR',        BASE_DIR . '/tickets/');
define('ANPR_IMAGES_DIR',  BASE_DIR . '/anpr_images/');
define('LOG_DIR',          BASE_DIR . '/logs/');

// ============================================================
// API SETTINGS
// ============================================================
define('API_CORS_ORIGIN', '*');
define('TICKET_PREFIX',   'TK');

// ============================================================
// HELPER: set JSON response headers
// ============================================================
function setJsonHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . API_CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Output a JSON success response and exit
 * @param mixed  $data
 * @param int    $status
 */
function jsonSuccess($data, int $status = 200): never {
    http_response_code($status);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Output a JSON error response and exit
 * @param string $message
 * @param int    $status
 */
function jsonError(string $message, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Get JSON body from request
 * @return array
 */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
