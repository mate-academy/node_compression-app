'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = http.createServer((req, resp) => {
    if (req.method === 'GET' && req.url === '/compress') {
      resp.statusCode = 400;

      return resp.end('request invalid');
    }

    if (req.method !== 'POST' || req.url !== '/compress') {
      if (req.method === 'GET' && req.url === '/') {
        resp.statusCode = 200;
        resp.end();

        return;
      } else {
        resp.statusCode = 404;

        return resp.end('request invalid');
      }
    }

    const form = new formidable.IncomingForm({
      keepExtensions: true,
      multiples: false,
    });

    form.parse(req, (erro, fields, files) => {
      if (erro) {
        resp.statusCode = 400;

        return resp.end('data error');
      }

      // aqui recebo o arquivo
      const nameFile = Array.isArray(files.file) ? files.file[0] : files.file;

      // aqui recebo uma informação
      const compressionTyp = Array.isArray(fields.compressionType)
        ? fields.compressionType[0]
        : fields.compressionType;

      if (!nameFile) {
        resp.statusCode = 400;

        return resp.end('You must upload a file.');
      }

      const originalName = nameFile.originalFilename;
      const caminhoTemp = nameFile.filepath;

      const streamLeitura = fs.createReadStream(caminhoTemp);

      switch (compressionTyp) {
        case 'gzip':
          const gzip = zlib.createGzip();

          resp.statusCode = 200;
          resp.setHeader('content-type', nameFile.mimetype);

          resp.setHeader(
            'content-disposition',
            `attachment; filename=${originalName + '.gz'}`,
          );

          streamLeitura.pipe(gzip).pipe(resp);

          break;
        case 'deflate':
          const def = zlib.createDeflate();

          resp.statusCode = 200;
          resp.setHeader('content-type', nameFile.mimetype);

          resp.setHeader(
            'content-disposition',
            `attachment; filename=${originalName + '.dfl'}`,
          );
          streamLeitura.pipe(def).pipe(resp);

          break;
        case 'br':
          const br = zlib.createBrotliCompress();

          resp.statusCode = 200;
          resp.setHeader('content-type', nameFile.mimetype);

          resp.setHeader(
            'content-disposition',
            `attachment; filename=${originalName + '.br'}`,
          );
          streamLeitura.pipe(br).pipe(resp);

          break;

        default:
          resp.statusCode = 400;

          return resp.end('not suported');
      }
    });
  });

  return server;
}

module.exports = {
  createServer,
};
