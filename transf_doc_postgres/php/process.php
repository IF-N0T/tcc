<?php
declare(strict_types=1);
require __DIR__.'/db.php';
function fail(string $message, int $status=400): never { http_response_code($status); echo '<h2>Erro no processamento</h2><p>'.h($message).'</p><a href="index.php">Voltar</a>'; exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Método não permitido.',405);
if (!isset($_FILES['arquivo']) || !is_array($_FILES['arquivo'])) fail('Nenhum arquivo recebido.');
$f=$_FILES['arquivo'];
if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Upload inválido ou incompleto.');
$size=filesize($f['tmp_name']);
if ($size === false || $size < 1 || $size > 10*1024*1024) fail('Arquivo vazio ou maior que 10 MB.');
$mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
if (!in_array($mime,['application/pdf','image/png','image/jpeg'],true)) fail('Formato não permitido.');
$bytes=file_get_contents($f['tmp_name']); if ($bytes===false) fail('Não foi possível ler o arquivo.');
$signatures=['application/pdf'=>str_starts_with($bytes,'%PDF-'),'image/png'=>str_starts_with($bytes,"\x89PNG\r\n\x1a\n"),'image/jpeg'=>str_starts_with($bytes,"\xFF\xD8\xFF")];
if (!$signatures[$mime]) fail('Assinatura do arquivo inválida.');
$engine=$_POST['engine']??''; if (!in_array($engine,['php','python','node'],true)) fail('Processador inválido.');
if ($engine==='php') {
 $result=['engine'=>'PHP','size'=>strlen($bytes),'mime'=>$mime,'sha256'=>hash('sha256',$bytes),'hex_preview'=>bin2hex(substr($bytes,0,128)),'base64_preview'=>base64_encode(substr($bytes,0,128))];
} else {
 $url=$engine==='python'?'http://python:5001/process':'http://node:5002/process';
 $ch=curl_init($url);
 curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$bytes,CURLOPT_HTTPHEADER=>['Content-Type: application/octet-stream','X-File-Mime: '.$mime],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30,CURLOPT_CONNECTTIMEOUT=>5]);
 $response=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
 if ($response===false || $status!==200) fail('Processador indisponível.',502);
 $result=json_decode($response,true);if (!is_array($result)) fail('Resposta inválida do processador.',502);
}
if (!hash_equals(hash('sha256',$bytes),(string)($result['sha256']??'')) || (int)($result['size']??-1)!==strlen($bytes) || ($result['mime']??'')!==$mime) fail('Falha na validação da resposta do processador.',502);
$name=basename(str_replace('\\','/',(string)$f['name']));
$name=mb_substr($name,0,255);if ($name==='') $name='arquivo';
$description=mb_substr(trim((string)($_POST['description']??'')),0,2000);
try {
 $stmt=db()->prepare("INSERT INTO documents (filename,mime_type,file_size,processor,sha256,hex_preview,base64_preview,generated_text,description,file_data) VALUES (:filename,:mime,:size,:processor,:sha,:hex,:preview,:generated,:description,decode(:binary_hex,'hex')) RETURNING id");
 $stmt->execute([':filename'=>$name,':mime'=>$mime,':size'=>strlen($bytes),':processor'=>(string)$result['engine'],':sha'=>hash('sha256',$bytes),':hex'=>(string)$result['hex_preview'],':preview'=>(string)$result['base64_preview'],':generated'=>base64_encode($bytes),':description'=>$description,':binary_hex'=>bin2hex($bytes)]);
 $id=(int)$stmt->fetchColumn();
 header('Location: document.php?id='.$id, true,303);exit;
} catch (Throwable $e) { error_log($e->getMessage()); fail('Não foi possível salvar no PostgreSQL. Consulte os logs.',500); }
