<?php
require __DIR__.'/db.php';
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT);if (!$id || $id<1){http_response_code(400);exit;}
$stmt=db()->prepare('SELECT filename,mime_type,file_data FROM documents WHERE id=:id');$stmt->execute([':id'=>$id]);$r=$stmt->fetch();if (!$r){http_response_code(404);exit;}
$data=$r['file_data'];if(is_resource($data)) $data=stream_get_contents($data);
if (!is_string($data)){http_response_code(500);exit;}
// PDO_PGSQL normalmente devolve BYTEA como representação hexadecimal 0x...
if(str_starts_with($data,'\x')){$decoded=hex2bin(substr($data,2));if($decoded===false){http_response_code(500);exit;}$data=$decoded;}
$download=isset($_GET['download']);
header('Content-Type: '.$r['mime_type']);header('X-Content-Type-Options: nosniff');header('Content-Security-Policy: sandbox');header('Content-Length: '.strlen($data));
header('Content-Disposition: '.($download?'attachment':'inline').'; filename="documento-'.$id.($r['mime_type']==='application/pdf'?'.pdf':($r['mime_type']==='image/png'?'.png':'.jpg')).'"');
echo $data;
