<?php
require __DIR__.'/db.php';
$id=filter_input(INPUT_GET,'id',FILTER_VALIDATE_INT);if(!$id || $id<1){http_response_code(400);exit;}
$stmt=db()->prepare('SELECT generated_text FROM documents WHERE id=:id');$stmt->execute([':id'=>$id]);$text=$stmt->fetchColumn();if($text===false){http_response_code(404);exit;}
header('Content-Type: text/plain; charset=utf-8');header('X-Content-Type-Options: nosniff');header('Content-Disposition: attachment; filename="documento-'.$id.'-base64.txt"');echo $text;
