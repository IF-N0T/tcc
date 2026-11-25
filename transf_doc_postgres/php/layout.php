<?php
require_once __DIR__.'/db.php';
function page_start(string $title): void { ?>
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?=h($title)?> — Laboratório BLOB</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/creativetimofficial/material-kit@master/assets/css/material-kit.css" rel="stylesheet">
<style>body{font-family:Roboto,system-ui,sans-serif;background:#f5f6fa;color:#273043}.navbar{background:linear-gradient(90deg,#273c75,#5e60ce)!important}.main-panel{max-width:1140px;margin:35px auto}.card{border:0;border-radius:15px;box-shadow:0 8px 28px #1b2b4b13}.table td{vertical-align:middle}.mono{font-family:ui-monospace,monospace;overflow-wrap:anywhere}.preview{max-width:100%;height:70vh;border:1px solid #ddd;border-radius:8px}.btn-primary{background:#4f46e5;border-color:#4f46e5}.text-break{overflow-wrap:anywhere}</style>
</head><body><nav class="navbar navbar-dark py-3"><div class="container"><a class="navbar-brand fw-bold text-white" href="index.php">Laboratório BLOB</a><div><a class="btn btn-sm btn-light me-2" href="index.php">Enviar arquivo</a><a class="btn btn-sm btn-outline-light" href="documents.php">Documentos</a></div></div></nav><main class="container main-panel"><h2 class="mb-4"><?=h($title)?></h2>
<?php }
function page_end(): void { echo '</main><script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script></body></html>'; }
