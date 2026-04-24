<?php
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$body        = getJsonBody();
$plateNumber = strtoupper(trim($body['plate_number'] ?? ''));
if (!$plateNumber) jsonError('plate_number richiesto');

$db  = Database::getInstance();
$existing = $db->fetchOne('SELECT id FROM abbonamenti WHERE plate_number = ?', [$plateNumber]);

$fields = ['nome','indirizzo','citta','cap','prov','stato','pi','cf','codun','info',
           'inabb','finabb','attivo','prezzo','Apay','SpayE','SpayC','Dpay','tipo_abb'];

// Explicit column-to-SQL name mapping to avoid dynamic interpolation
$columnMap = [
    'nome' => 'nome', 'indirizzo' => 'indirizzo', 'citta' => 'citta',
    'cap' => 'cap', 'prov' => 'prov', 'stato' => 'stato', 'pi' => 'pi',
    'cf' => 'cf', 'codun' => 'codun', 'info' => 'info',
    'inabb' => 'inabb', 'finabb' => 'finabb', 'attivo' => 'attivo',
    'prezzo' => 'prezzo', 'Apay' => 'Apay', 'SpayE' => 'SpayE',
    'SpayC' => 'SpayC', 'Dpay' => 'Dpay', 'tipo_abb' => 'tipo_abb',
];

if ($existing) {
    $set    = [];
    $params = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body) && isset($columnMap[$f])) {
            $col      = $columnMap[$f];
            $set[]    = "`{$col}` = ?";
            $params[] = $body[$f];
        }
    }
    if ($set) {
        $params[] = $plateNumber;
        $db->query('UPDATE abbonamenti SET ' . implode(', ', $set) . ', updated_at = NOW() WHERE plate_number = ?', $params);
    }
    $id = $existing['id'];
} else {
    $cols   = ['plate_number'];
    $vals   = [$plateNumber];
    $marks  = ['?'];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body) && isset($columnMap[$f])) {
            $col     = $columnMap[$f];
            $cols[]  = "`{$col}`";
            $vals[]  = $body[$f];
            $marks[] = '?';
        }
    }
    $id = (int)$db->insert(
        'INSERT INTO abbonamenti (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $marks) . ')',
        $vals
    );
}

$abb = $db->fetchOne('SELECT * FROM abbonamenti WHERE id = ?', [$id]);
jsonSuccess(['abbonamento' => $abb]);
