'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('node:zlib');
const { IncomingForm } = require('formidable');

const compressionTypes = {
  gzip: {
    compress: zlib.gzip,
    extension: 'gz',
  },
  deflate: {
    compress: zlib.deflate,
    extension: 'dfl',
  },
  br: {
    compress: zlib.brotliCompress,
    extension: 'br',
  },
};

function sendHtml(response) {
  const filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, 'utf8', (error, content) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Internal Server Error');

      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(content);
  });
}

function sendBadRequest(response) {
  response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Bad Request');
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not Found');
}

function createServer() {
  return http.createServer((request, response) => {
    const { method, url } = request;

    if (method === 'GET' && url === '/') {
      sendHtml(response);

      return;
    }

    if (method === 'GET' && url === '/compress') {
      sendBadRequest(response);

      return;
    }

    if (method === 'POST' && url === '/compress') {
      const form = new IncomingForm({ multiples: false });

      form.parse(request, async (error, fields, files) => {
        if (error) {
          sendBadRequest(response);

          return;
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;
        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!file || !compressionType) {
          sendBadRequest(response);

          return;
        }

        if (!compressionTypes[compressionType]) {
          sendBadRequest(response);

          return;
        }

        const filePath = file.filepath || file.file?.path || file.path;
        const filename =
          file.originalFilename ||
          file.name ||
          path.basename(filePath || 'unknown');

        if (!filePath || !filename) {
          sendBadRequest(response);

          return;
        }

        fs.readFile(filePath, (readError, fileBuffer) => {
          if (readError) {
            sendBadRequest(response);

            return;
          }

          const { compress, extension } = compressionTypes[compressionType];

          compress(fileBuffer, (compressError, compressed) => {
            if (compressError) {
              sendBadRequest(response);

              return;
            }

            response.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename=${filename}.${extension}`,
            });
            response.end(compressed);
          });
        });
      });

      return;
    }

    sendNotFound(response);
  });
}

module.exports = {
  createServer,
};
