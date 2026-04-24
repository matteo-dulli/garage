<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body = getJsonBody();
$id   = (int)($body['id'] ?? 0);
if (!$id) jsonError('ID mancante');

$db      = Database::getInstance();
$passage = $db->fetchOne('SELECT * FROM passages WHERE id = ?', [$id]);
if (!$passage) jsonError('Passaggio non trovato', 404);

// Delete associated ticket
$db->query('DELETE FROM tickets WHERE passage_id = ?', [$id]);

// Delete passage
$db->query('DELETE FROM passages WHERE id = ?', [$id]);

jsonSuccess(['deleted' => true, 'id' => $id]);
