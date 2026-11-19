'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { formidable } = require('formidable');

const COMPRESSION_TYPES = {
  gzip: { createCompress: () => zlib.createGzip(), extension: '.gz' },
  deflate: { createCompress: () => zlib.createDeflate(), extension: '.dfl' },
  br: { createCompress: () => zlib.createBrotliCompress(), extension: '.br' },
};

const HTML_FORM = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Compression App</title>
</head>
<body>
  <form action="/compress" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required>
    <select name="compressionType" required>
      <option value="gzip">gzip</option>
      <option value="deflate">deflate</option>
      <option value="br">br</option>
    </select>
    <button type="submit">Compress</button>
  </form>
</body>
</html>
`;

async function handleCompress(req, res) {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024,
  });

  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.writeHead(400);
        res.end('Invalid form data');

        return resolve();
      }

      const file = files.file?.[0];
      const compressionType = fields.compressionType?.[0];

      if (!file || !file.filepath) {
        res.writeHead(400);
        res.end('No file provided');

        return resolve();
      }

      if (!compressionType || !COMPRESSION_TYPES[compressionType]) {
        res.writeHead(400);
        res.end('Unsupported compression type');

        return resolve();
      }

      const { createCompress, extension } = COMPRESSION_TYPES[compressionType];
      const originalName = file.originalFilename || 'file';
      const compressedName = `${originalName}${extension}`;

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${compressedName}`,
      });

      const fileStream = fs.createReadStream(file.filepath);
      const compressStream = createCompress();

      try {
        await pipeline(fileStream, compressStream, res);
      } catch {
        res.destroy();
      } finally {
        fs.unlink(file.filepath, () => {});
      }

      resolve();
    });
  });
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(HTML_FORM);

      return;
    }

    if (req.url === '/compress') {
      if (req.method === 'GET') {
        res.writeHead(400);
        res.end('GET not allowed');

        return;
      }

      if (req.method === 'POST') {
        await handleCompress(req, res);

        return;
      }
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return server;
}

module.exports = {
  createServer,
};
