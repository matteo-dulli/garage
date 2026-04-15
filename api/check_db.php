<?php
/**
 * check_db.php - Check database connectivity and schema health
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

$requiredTables = [
    'plates', 'passages', 'tickets', 'subscriptions',
    'prepaid_cards', 'plate_authorizations', 'audit_log',
];

$status = [
    'db_connected' => false,
    'tables'       => [],
    'missing'      => [],
    'version'      => null,
];

try {
    $db = Database::getInstance();

    $row = $db->fetchOne('SELECT VERSION() AS v');
    $status['db_connected'] = true;
    $status['version']      = $row['v'] ?? null;

    // Check required tables
    $existing = $db->fetchAll('SHOW TABLES');
    $existingNames = array_map(fn($r) => array_values($r)[0], $existing);

    foreach ($requiredTables as $table) {
        $present = in_array($table, $existingNames, true);
        $status['tables'][$table] = $present;
        if (!$present) {
            $status['missing'][] = $table;
        }
    }

    $status['healthy'] = empty($status['missing']);

    echo json_encode(['success' => true, 'status' => $status], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    $status['error'] = APP_DEBUG ? $e->getMessage() : 'Connessione al database fallita';
    http_response_code(500);
    echo json_encode(['success' => false, 'status' => $status], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
