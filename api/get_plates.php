<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();

$status = trim($_GET['status'] ?? 'all');
$db     = Database::getInstance();

$sql = 'SELECT p.*,
        (SELECT pa.entry_datetime FROM passages pa WHERE pa.plate_id = p.id ORDER BY pa.id DESC LIMIT 1) AS last_entry,
        (SELECT pa.exit_datetime  FROM passages pa WHERE pa.plate_id = p.id ORDER BY pa.id DESC LIMIT 1) AS last_exit,
        (SELECT pa.id             FROM passages pa WHERE pa.plate_id = p.id ORDER BY pa.id DESC LIMIT 1) AS last_passage_id,
        EXISTS(SELECT 1 FROM abbonamenti ab WHERE ab.plate_number = p.plate_number AND ab.attivo = 1) AS has_subscription
        FROM plates p
        ORDER BY p.updated_at DESC';

$plates = $db->fetchAll($sql);

// Apply PHP-side status filter for types not easily done in SQL
if ($status !== 'all') {
    $plates = array_values(array_filter($plates, function ($p) use ($status) {
        switch ($status) {
            case 'inside':       return $p['last_entry'] && !$p['last_exit'];
            case 'outside':      return !$p['last_entry'] || !!$p['last_exit'];
            case 'ticket':       return !empty($p['ticket_code']);
            case 'subscription': return (bool)$p['has_subscription'];
            default:             return true;
        }
    }));
}

// Compute stats
$inside  = count(array_filter($plates, fn($p) => $p['last_entry'] && !$p['last_exit']));
$total   = count($plates);
$todayStart = date('Y-m-d 00:00:00');
$ticketsToday = $db->fetchOne(
    'SELECT COUNT(*) AS cnt FROM tickets WHERE created_at >= ?',
    [$todayStart]
);

jsonSuccess([
    'plates' => $plates,
    'stats'  => [
        'inside'  => $inside,
        'total'   => $total,
        'tickets' => $ticketsToday['cnt'] ?? 0,
    ],
]);
