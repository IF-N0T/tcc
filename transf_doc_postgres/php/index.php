<?php require __DIR__.'/layout.php'; page_start('Enviar documento'); ?>
<div class="row"><div class="col-lg-8"><div class="card p-4"><p class="text-secondary">Envie um PDF ou imagem para armazenar o arquivo original no PostgreSQL. A representação Base64 será salva como texto, sem OCR.</p>
<form action="process.php" method="post" enctype="multipart/form-data">
<div class="mb-3"><label for="arquivo" class="form-label fw-bold">Arquivo (até 10 MB)</label><input class="form-control" id="arquivo" type="file" name="arquivo" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required></div>
<div class="mb-3"><label for="engine" class="form-label fw-bold">Processador</label><select class="form-select" id="engine" name="engine"><option value="php">PHP</option><option value="python">Python</option><option value="node">JavaScript (Node.js)</option></select></div>
<div class="mb-3"><label for="description" class="form-label fw-bold">Descrição opcional</label><textarea class="form-control" name="description" id="description" maxlength="2000" rows="3" placeholder="Observações sobre o documento"></textarea></div>
<button class="btn btn-primary" type="submit">Processar e salvar</button> <a class="btn btn-outline-secondary" href="documents.php">Ver documentos</a></form></div></div></div>
<?php page_end(); ?>
