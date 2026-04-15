<?php
/**
 * get_tickets.php - Return all tickets with passage and plate info
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

try {
    $db = Database::getInstance();

    $tickets = $db->fetchAll(
        'SELECT t.*, pg.entry_datetime, pg.exit_datetime, p.plate_number
         FROM tickets t
         JOIN passages pg ON pg.id = t.passage_id
         LEFT JOIN plates p ON p.id = pg.plate_id
         ORDER BY t.created_at DESC'
    );

    echo json_encode(['success' => true, 'tickets' => $tickets], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
