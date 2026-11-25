<?php
require __DIR__.'/layout.php';
try {$rows=db()->query('SELECT id,filename,mime_type,file_size,processor,created_at FROM documents ORDER BY created_at DESC LIMIT 200')->fetchAll();}catch(Throwable $e){error_log($e->getMessage());http_response_code(500);exit('Falha ao consultar documentos.');}
page_start('Documentos armazenados'); ?>
<div class="card p-4"><div class="d-flex justify-content-between align-items-center mb-3"><p class="mb-0 text-secondary">Últimos 200 documentos</p><a href="index.php" class="btn btn-primary btn-sm">Novo upload</a></div><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>ID</th><th>Nome</th><th>Data e hora</th><th>Tipo</th><th>Tamanho</th><th>Processador</th><th>Ação</th></tr></thead><tbody>
<?php foreach($rows as $r): ?><tr><td><?= (int)$r['id'] ?></td><td><?=h($r['filename'])?></td><td><?=h((new DateTimeImmutable($r['created_at']))->setTimezone(new DateTimeZone('America/Sao_Paulo'))->format('d/m/Y H:i:s'))?></td><td><?=h($r['mime_type'])?></td><td><?=number_format((int)$r['file_size']/1024,1,',','.')?> KB</td><td><?=h($r['processor'])?></td><td><a class="btn btn-sm btn-outline-primary" href="document.php?id=<?=(int)$r['id']?>">Visualizar</a></td></tr><?php endforeach; ?>
<?php if (!$rows): ?><tr><td colspan="7" class="text-center text-secondary py-4">Nenhum documento armazenado.</td></tr><?php endif; ?></tbody></table></div></div>
<?php page_end(); ?>
