<?php
/**
 * delete_passage.php - Delete a single passage (and its ticket)
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
    $db  = Database::getInstance();
    $pdo = $db->getConnection();

    $passage = $db->fetchOne('SELECT id FROM passages WHERE id = ?', [$id]);
    if (!$passage) {
        jsonError('Passaggio non trovato', 404);
    }

    $pdo->beginTransaction();
    $db->query('DELETE FROM tickets WHERE passage_id = ?', [$id]);
    $db->query('DELETE FROM passages WHERE id = ?', [$id]);
    $pdo->commit();

    echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
