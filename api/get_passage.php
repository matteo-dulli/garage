<?php
/**
 * get_passage.php - Return a single passage with ticket info
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    jsonError('ID passaggio non valido');
}

try {
    $db = Database::getInstance();

    $passage = $db->fetchOne(
        'SELECT pg.*, t.ticket_code, t.amount, t.paid, t.printed_at, p.plate_number
         FROM passages pg
         LEFT JOIN tickets t ON t.passage_id = pg.id
         LEFT JOIN plates p ON p.id = pg.plate_id
         WHERE pg.id = ?',
        [$id]
    );

    if (!$passage) {
        jsonError('Passaggio non trovato', 404);
    }

    echo json_encode(['success' => true, 'passage' => $passage], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
