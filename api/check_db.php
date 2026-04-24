<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();

try {
    $db     = Database::getInstance();
    $tables = $db->fetchAll('SHOW TABLES');
    $list   = array_map(fn($r) => array_values($r)[0], $tables);
    jsonSuccess(['connected' => true, 'tables' => $list, 'db' => DB_NAME]);
} catch (\Exception $e) {
    jsonError('DB non raggiungibile: ' . $e->getMessage(), 503);
}
