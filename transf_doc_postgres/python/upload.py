from flask import Flask, request, jsonify
import base64
import hashlib

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
ALLOWED = {'application/pdf', 'image/png', 'image/jpeg'}

# ==========================================
# HEALTHCHECK - MONITORAMENTO DO DOCKER
# ==========================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "python",
        "message": "API Python funcionando"
    }, 200

@app.post('/process')

def process():
    if request.content_type != 'application/octet-stream':
        return jsonify(error='Tipo de requisição inválido'), 415
    mime = request.headers.get('X-File-Mime', '')
    if mime not in ALLOWED:
        return jsonify(error='Tipo MIME não permitido'), 415
    blob = request.get_data()
    if not blob:
        return jsonify(error='Arquivo vazio'), 400
    return jsonify(engine='Python', size=len(blob), mime=mime,
                   sha256=hashlib.sha256(blob).hexdigest(),
                   hex_preview=blob[:128].hex(),
                   base64_preview=base64.b64encode(blob[:128]).decode('ascii'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
