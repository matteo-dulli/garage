<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body      = getJsonBody();
$passageId = (int)($body['passage_id'] ?? 0);
$note      = trim($body['note'] ?? '');

if (!$passageId) jsonError('passage_id richiesto');

$db = Database::getInstance();

$ticket = $db->fetchOne('SELECT id FROM tickets WHERE passage_id = ?', [$passageId]);
if ($ticket) {
    $db->query('UPDATE tickets SET note = ?, updated_at = NOW() WHERE passage_id = ?', [$note ?: null, $passageId]);
} else {
    // No ticket yet — store in passage notes as fallback
    $db->query('UPDATE passages SET notes = ?, updated_at = NOW() WHERE id = ?', [$note ?: null, $passageId]);
}

jsonSuccess(['updated' => true]);
