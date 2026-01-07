'use strict';

const http = require('http');
const zlib = require('zlib');
const Busboy = require('busboy');
const { Readable } = require('stream');

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    // 1. Rota Raiz (Obrigatório para o teste do status 200)
    if (url === '/' && method === 'GET') {
      res.writeHead(200);

      return res.end();
    }

    // 2. Erro 400: GET enviado para /compress
    if (url === '/compress' && method === 'GET') {
      res.writeHead(400);

      return res.end();
    }

    // 3. Erro 404: Endpoint inexistente
    if (url !== '/compress') {
      res.writeHead(404);

      return res.end();
    }

    // 4. Validação do Content-Type (Multipart/form-data)
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      res.writeHead(400);

      return res.end();
    }

    const bb = Busboy({ headers: req.headers });
    let compressionType;
    let filename;
    let fileBuffer;

    bb.on('field', (name, value) => {
      if (name === 'compressionType') {
        compressionType = value;
      }
    });

    bb.on('file', (name, stream, info) => {
      if (name === 'file') {
        filename = info.filename;

        const chunks = [];

        stream.on('data', (chunk) => chunks.push(chunk));

        stream.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      } else {
        stream.resume();
      }
    });

    bb.on('finish', () => {
      // Ajustado para usar as extensões extatas que o teste espera
      const extensions = {
        gzip: { ext: '.gzip', create: zlib.createGzip },
        deflate: { ext: '.deflate', create: zlib.createDeflate },
        br: { ext: '.br', create: zlib.createBrotliCompress },
      };

      if (!fileBuffer || !compressionType || !extensions[compressionType]) {
        res.writeHead(400);

        return res.end();
      }

      const config = extensions[compressionType];

      // Removido as aspas duplas (\") para bater com o Expected do teste
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${filename}${config.ext}`,
      });

      const compressor = config.create();

      Readable.from(fileBuffer).pipe(compressor).pipe(res);
    });

    req.pipe(bb);
  });
}

module.exports = { createServer };
