<?php
declare(strict_types=1);
function db(): PDO {
 static $pdo = null;
 if ($pdo instanceof PDO) return $pdo;
 $host = getenv('DB_HOST') ?: 'postgres';
 $port = getenv('DB_PORT') ?: '5432';
 $name = getenv('DB_NAME') ?: 'extrator';
 $user = getenv('DB_USER') ?: 'extrator';
 $password = getenv('DB_PASSWORD');
 $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$name", $user, $password, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 return $pdo;
}
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
