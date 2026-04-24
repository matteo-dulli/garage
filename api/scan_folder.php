<?php
require_once dirname(__DIR__) . '/config/config.php';
require_once dirname(__DIR__) . '/config/database.php';

setJsonHeaders();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo non consentito', 405);

$db      = Database::getInstance();
$folder  = MONITORED_FOLDER;
$found   = 0;
$skipped = 0;

if (!is_dir($folder)) {
    jsonSuccess(['found' => 0, 'skipped' => 0, 'message' => 'Cartella non trovata: ' . $folder]);
}

$files = glob($folder . '*.{jpg,jpeg,png,bmp}', GLOB_BRACE);
if (!$files) {
    jsonSuccess(['found' => 0, 'skipped' => 0, 'message' => 'Nessuna immagine trovata']);
}

foreach ($files as $file) {
    $basename = basename($file);
    // Expected naming: PLATE_YYYYMMDD_HHMMSS.jpg or PLATE_timestamp.jpg
    $name = pathinfo($basename, PATHINFO_FILENAME);
    $parts = explode('_', $name);
    $plateNumber = strtoupper($parts[0] ?? '');

    if (strlen($plateNumber) < 2 || strlen($plateNumber) > 10) {
        $skipped++;
        continue;
    }

    // Check if already processed (passage with this image)
    $existing = $db->fetchOne('SELECT id FROM passages WHERE entry_image = ?', [$basename]);
    if ($existing) {
        $skipped++;
        continue;
    }

    // Get or create plate
    $plate = $db->fetchOne('SELECT id FROM plates WHERE plate_number = ?', [$plateNumber]);
    if (!$plate) {
        $pid = (int)$db->insert(
            'INSERT INTO plates (plate_number, created_at, updated_at) VALUES (?, NOW(), NOW())',
            [$plateNumber]
        );
    } else {
        $pid = (int)$plate['id'];
    }

    // Determine entry datetime from filename or file mtime
    $entryDt = null;
    if (isset($parts[1]) && isset($parts[2])) {
        $dtStr = $parts[1] . $parts[2];
        $d = DateTime::createFromFormat('YmdHis', $dtStr);
        if ($d) $entryDt = $d->format('Y-m-d H:i:s');
    }
    if (!$entryDt) {
        $entryDt = date('Y-m-d H:i:s', filemtime($file));
    }

    $db->insert(
        'INSERT INTO passages (plate_id, entry_datetime, entry_image, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [$pid, $entryDt, $basename]
    );
    $found++;
}

jsonSuccess(['found' => $found, 'skipped' => $skipped]);
