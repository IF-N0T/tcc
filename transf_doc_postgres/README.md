# Laboratório BLOB — PHP, Python, Node.js e PostgreSQL

Projeto derivado do `transf_doc(1).zip`. Preserva o processamento binário sem OCR e acrescenta persistência no PostgreSQL 17 e painel Bootstrap com estilos Material Kit.

## Iniciar

```bash
cp .env.example .env
# Edite POSTGRES_PASSWORD com uma senha forte

docker compose up -d --build
docker compose ps
```

Acesse http://127.0.0.1:8000 e a listagem em http://127.0.0.1:8000/documents.php.

O arquivo original é armazenado como BYTEA. `generated_text` armazena Base64 completo, **não** o texto do PDF/imagem. Para texto legível será preciso integrar OCR ou extração de PDF textual em uma etapa futura.

Os dados persistem no volume `postgres_data`. **Não execute `docker compose down -v`**, pois isso apaga o volume e os documentos.

O SQL em `database/init.sql` é executado apenas na primeira criação do volume PostgreSQL.

## Segurança

A aplicação é um laboratório local sem autenticação. Não publique em rede ou internet sem adicionar autenticação, autorização, CSRF, limites de taxa, análise de arquivos e HTTPS. A folha Material Kit e o Bootstrap dependem de acesso à internet para carregar os estilos.
