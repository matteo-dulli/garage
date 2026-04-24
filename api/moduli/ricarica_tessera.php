<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body   = getJsonBody();
$id     = (int)($body['id'] ?? 0);
$prezzo = isset($body['prezzo']) ? (float)$body['prezzo'] : null;

if (!$id)     jsonError('id richiesto');
if ($prezzo === null || $prezzo <= 0) jsonError('prezzo richiesto e deve essere > 0');

$db      = Database::getInstance();
$tessera = $db->fetchOne('SELECT * FROM tesserapre WHERE id = ? AND canc = 0', [$id]);
if (!$tessera) jsonError('Tessera non trovata o annullata', 404);

$dpay = trim($body['Dpay'] ?? '') ?: date('Y-m-d H:i:s');
$apay = isset($body['Apay'])  ? (int)(bool)$body['Apay']  : (int)(bool)$tessera['Apay'];
$spayE = isset($body['SpayE']) ? (int)(bool)$body['SpayE'] : 0;
$spayC = isset($body['SpayC']) ? (int)(bool)$body['SpayC'] : 0;

// Append to logpay
$logEntry = $prezzo . '|' . $dpay . "\n";
$newLog   = ($tessera['logpay'] ?? '') . $logEntry;

$db->query(
    'UPDATE tesserapre SET res1 = res1 + ?, prezzo = ?, Apay = ?, SpayE = ?, SpayC = ?, Dpay = ?, logpay = ?, updated_at = NOW() WHERE id = ?',
    [$prezzo, $prezzo, $apay, $spayE, $spayC, $dpay, $newLog, $id]
);

$updated = $db->fetchOne('SELECT * FROM tesserapre WHERE id = ?', [$id]);
jsonSuccess(['tessera' => $updated]);
