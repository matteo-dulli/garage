<?php
/**
 * scan_folder.php - Scan ANPR monitored folder for new plate images
 * Garage ANPR Management System
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

setJsonHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Metodo non consentito', 405);
}

if (!defined('MONITORED_FOLDER') || !is_dir(MONITORED_FOLDER)) {
    jsonError('Cartella ANPR non configurata o non esistente', 500);
}

try {
    $db = Database::getInstance();

    $imageExtensions = ['jpg', 'jpeg', 'png', 'bmp'];
    $files           = scandir(MONITORED_FOLDER);
    $newPlates       = 0;
    $newPassages     = 0;
    $processed       = [];
    $errors          = [];

    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, $imageExtensions, true)) continue;

        // Expected filename pattern: PLATE_YYYYMMDD_HHMMSS_[entry|exit].jpg
        // Or simply: PLATE.jpg (fallback)
        $nameWithoutExt = pathinfo($file, PATHINFO_FILENAME);
        $parts          = explode('_', $nameWithoutExt);
        $plateNumber    = strtoupper($parts[0]);

        if (!preg_match('/^[A-Z0-9]{2,10}$/', $plateNumber)) {
            $errors[] = "Filename non valido: $file";
            continue;
        }

        $direction = 'entry'; // default
        if (isset($parts[3])) {
            $d = strtolower($parts[3]);
            if ($d === 'exit' || $d === 'uscita') {
                $direction = 'exit';
            }
        }

        $imagePath = ANPR_IMAGES_DIR . $file;

        // Find or create plate
        $plate = $db->fetchOne('SELECT id FROM plates WHERE plate_number = ?', [$plateNumber]);
        if (!$plate) {
            $plateId = (int)$db->insert(
                'INSERT INTO plates (plate_number, type, created_at, updated_at) VALUES (?, \'transit\', NOW(), NOW())',
                [$plateNumber]
            );
            $newPlates++;
        } else {
            $plateId = (int)$plate['id'];
        }

        if ($direction === 'entry') {
            // Open new passage
            $passageId = (int)$db->insert(
                'INSERT INTO passages (plate_id, entry_datetime, entry_image, created_at) VALUES (?, NOW(), ?, NOW())',
                [$plateId, $imagePath]
            );
            $newPassages++;
        } else {
            // Close last open passage
            $openPassage = $db->fetchOne(
                'SELECT id FROM passages WHERE plate_id = ? AND exit_datetime IS NULL ORDER BY id DESC LIMIT 1',
                [$plateId]
            );
            if ($openPassage) {
                $db->query(
                    'UPDATE passages SET exit_datetime = NOW(), exit_image = ?, updated_at = NOW() WHERE id = ?',
                    [$imagePath, (int)$openPassage['id']]
                );
            } else {
                // No open passage: create a complete passage with both timestamps
                $db->insert(
                    'INSERT INTO passages (plate_id, exit_datetime, exit_image, created_at) VALUES (?, NOW(), ?, NOW())',
                    [$plateId, $imagePath]
                );
                $newPassages++;
            }
        }

        $processed[] = $file;

        // Move processed file to archive subfolder
        $archiveDir = MONITORED_FOLDER . 'processed/';
        if (!is_dir($archiveDir)) {
            @mkdir($archiveDir, 0755, true);
        }
        @rename(MONITORED_FOLDER . $file, $archiveDir . $file);
    }

    echo json_encode([
        'success'      => true,
        'new_plates'   => $newPlates,
        'new_passages' => $newPassages,
        'processed'    => $processed,
        'errors'       => $errors,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    jsonError(APP_DEBUG ? $e->getMessage() : 'Errore interno del server', 500);
}
