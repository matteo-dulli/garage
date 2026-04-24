<?php
/**
 * config.php - Application configuration
 * Garage ANPR Management System
 */

define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', APP_ENV === 'development');

define('DB_HOST',    getenv('DB_HOST')    ?: 'localhost');
define('DB_PORT',    (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME',    getenv('DB_NAME')    ?: 'garage_anpr');
define('DB_USER',    getenv('DB_USER')    ?: 'garage_user');
define('DB_PASS',    getenv('DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8mb4');

define('BASE_DIR',         dirname(__DIR__));
define('MONITORED_FOLDER', BASE_DIR . '/anpr_images/');
define('PRINT_DIR',        BASE_DIR . '/tickets/');
define('ANPR_IMAGES_DIR',  BASE_DIR . '/anpr_images/');
define('LOG_DIR',          BASE_DIR . '/logs/');
define('COSTANTI_FILE',    BASE_DIR . '/costanti.txt');

define('API_CORS_ORIGIN', '*');
define('TICKET_PREFIX',   'TK');

// Subscription expiry warning threshold in days
define('SUB_EXPIRY_WARN_DAYS', 7);

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

function jsonSuccess($data, int $status = 200): never {
    http_response_code($status);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(string $message, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Load constants from costanti.txt
 * Returns array keyed by section name (e.g. 'ABBONAMENTI' => ['Mensile', ...])
 */
function loadCostanti(): array {
    $file = COSTANTI_FILE;
    if (!file_exists($file)) return [];
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $result = [];
    $current = null;
    foreach ($lines as $line) {
        $line = trim($line);
        if (str_starts_with($line, '#')) {
            $current = trim(substr($line, 1));
            $result[$current] = [];
        } elseif ($current !== null) {
            $result[$current][] = $line;
        }
    }
    return $result;
}

/**
 * Get the PDO connection (alias for Database::getInstance()->getConnection())
 */
function getDatabaseConnection(): PDO {
    require_once __DIR__ . '/database.php';
    return Database::getInstance()->getConnection();
}
