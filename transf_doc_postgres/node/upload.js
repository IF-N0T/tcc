const http = require('node:http');
const crypto = require('node:crypto');
const MAX = 10 * 1024 * 1024;
const allowed = new Set(['application/pdf','image/png','image/jpeg']);
http.createServer((req,res) => {
  const reply = (status, obj) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); };
  // ==========================================
  // HEALTHCHECK - MONITORAMENTO DO DOCKER
  // ==========================================

  if (req.method === "GET" && req.url === "/health") {
      return reply(200, {
          status: "healthy",
          service: "node",
          message: "API Node.js funcionando"
      });
  }
  if (req.method !== 'POST' || req.url !== '/process') {
    return reply(404, {error: 'Rota inválida'});
  }
  if (req.headers['content-type'] !== 'application/octet-stream') return reply(415,{error:'Requisição inválida'});
  const mime = req.headers['x-file-mime'];
  if (!allowed.has(mime)) return reply(415,{error:'Tipo MIME não permitido'});
  const chunks = []; let size = 0; let exceeded = false;
  req.on('data',chunk => {size += chunk.length; if (size > MAX) {exceeded=true; chunks.length=0;} else if (!exceeded) chunks.push(chunk);});
  req.on('end',() => {
    if (exceeded) return reply(413,{error:'Arquivo muito grande'});
    if (!size) return reply(400,{error:'Arquivo vazio'});
    const blob = Buffer.concat(chunks);
    reply(200,{engine:'JavaScript (Node.js)',size:blob.length,mime,sha256:crypto.createHash('sha256').update(blob).digest('hex'),hex_preview:blob.subarray(0,128).toString('hex'),base64_preview:blob.subarray(0,128).toString('base64')});
  });
}).listen(5002,'0.0.0.0');
