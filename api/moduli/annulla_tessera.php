<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body   = getJsonBody();
$id     = (int)($body['id'] ?? 0);
$motivo = trim($body['motivo'] ?? '');

if (!$id) jsonError('id richiesto');

$db      = Database::getInstance();
$tessera = $db->fetchOne('SELECT * FROM tesserapre WHERE id = ?', [$id]);
if (!$tessera) jsonError('Tessera non trovata', 404);

$db->query(
    'UPDATE tesserapre SET canc = 1, attivo = 0, motivo = ?, updated_at = NOW() WHERE id = ?',
    [$motivo ?: null, $id]
);

jsonSuccess(['annullata' => true, 'id' => $id]);
