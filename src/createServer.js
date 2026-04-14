'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { formidable } = require('formidable');

const compressionMap = {
  gzip: {
    createCompressor: () => zlib.createGzip(),
    extension: 'gz',
  },
  deflate: {
    createCompressor: () => zlib.createDeflate(),
    extension: 'dfl',
  },
  br: {
    createCompressor: () => zlib.createBrotliCompress(),
    extension: 'br',
  },
};

const htmlPage = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Compression App</title>
  </head>
  <body>
    <h1>Compression App</h1>
    <form action="/compress" method="POST" enctype="multipart/form-data">
      <label>
        File:
        <input type="file" name="file" required />
      </label>
      <br />
      <label>
        Compression type:
        <select name="compressionType" required>
          <option value="gzip">gzip</option>
          <option value="deflate">deflate</option>
          <option value="br">br</option>
        </select>
      </label>
      <br />
      <button type="submit">Compress</button>
    </form>
  </body>
</html>`;

function normalizeFieldValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getFileFromField(fileField) {
  if (Array.isArray(fileField)) {
    return fileField[0];
  }

  return fileField;
}

function sendBadRequest(res) {
  res.statusCode = 400;
  res.end('Bad Request');
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(htmlPage);

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      sendBadRequest(res);

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      const form = formidable({ multiples: false });

      form.parse(req, (error, fields, files) => {
        if (error) {
          sendBadRequest(res);

          return;
        }

        const compressionType = normalizeFieldValue(fields.compressionType);
        const file = getFileFromField(files.file);

        if (!compressionType || !file || !file.originalFilename) {
          sendBadRequest(res);

          return;
        }

        const compressionConfig = compressionMap[compressionType];

        if (!compressionConfig) {
          sendBadRequest(res);

          return;
        }

        const compressedFileName = `${file.originalFilename}.${compressionConfig.extension}`;

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${compressedFileName}`,
        );

        const compressedStream = compressionConfig.createCompressor();

        fs.createReadStream(file.filepath).pipe(compressedStream).pipe(res);
      });

      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });
}

module.exports = {
  createServer,
};
