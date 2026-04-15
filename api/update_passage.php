<?php
/**
 * update_passage.php - Update passage data (entry/exit datetimes, notes, info)
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

$body = getJsonBody();
$id   = isset($body['id']) ? (int)$body['id'] : 0;
if ($id <= 0) {
    jsonError('ID passaggio non valido');
}

try {
    $db = Database::getInstance();

    $passage = $db->fetchOne('SELECT id FROM passages WHERE id = ?', [$id]);
    if (!$passage) {
        jsonError('Passaggio non trovato', 404);
    }

    $fields = [];
    $params = [];

    if (isset($body['entry_datetime'])) {
        $fields[] = 'entry_datetime = ?';
        $params[] = $body['entry_datetime'] ?: null;
    }
    if (isset($body['exit_datetime'])) {
        $fields[] = 'exit_datetime = ?';
        $params[] = $body['exit_datetime'] ?: null;
    }
    if (isset($body['notes'])) {
        $fields[] = 'notes = ?';
        $params[] = trim($body['notes']);
    }
    if (isset($body['info'])) {
        $fields[] = 'info = ?';
        $params[] = trim($body['info']);
    }
    if (isset($body['paid'])) {
        $fields[] = 'paid = ?';
        $params[] = (int)(bool)$body['paid'];
    }

    if (empty($fields)) {
        jsonError('Nessun campo da aggiornare');
    }

    $fields[] = 'updated_at = NOW()';
    $params[] = $id;

    $db->query(
        'UPDATE passages SET ' . implode(', ', $fields) . ' WHERE id = ?',
        $params
    );

    echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
