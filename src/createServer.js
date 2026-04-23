'use strict';

const http = require('http');
const zlib = require('zlib');
const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');

const html = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File compression</title>
</head>

<body>
    <h1>Стиснення файлів</h1>

    <form action='./compress' id='uploadForm' enctype="multipart/form-data" style="display: flex; flex-direction: column; max-width: 400px;">
      <label for='file'>Оберіть файл:</label>
      <input type='file' id="file" name='file' required>

      <label for='compressionType'>Оберіть тип стиснення:</label>
      <select id="compressionType" name='compressionType' style="max-width: 200px;">
        <option value='gzip'>Gzip</option>
        <option value='deflate'>Deflate</option>
        <option value='br'>Br</option>
      </select>

      <button type='submit' style="max-width: 200px;">Стиснути файл</button>
    </form>
</body>
</html>
`;

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else if (req.url === '/compress' && req.method === 'POST') {
      const form = new multiparty.Form();

      form.parse(req, (parseError, fields, files) => {
        if (parseError) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('File upload error.');

          return;
        }

        const file = files.file?.[0];
        const compressionType = fields.compressionType?.[0];

        if (!file) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No file uploaded.');

          return;
        }

        if (!compressionType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No compression type provided.');

          return;
        }

        if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Unsupported compression type.');

          return;
        }

        const fileExt = path.extname(file.originalFilename);
        const fileName = path.basename(file.originalFilename, fileExt);
        const outputFileName = `${fileName}${fileExt}.${compressionType}`;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${outputFileName}`,
        });

        const readStream = fs.createReadStream(file.path);
        let compressStream;

        if (compressionType === 'gzip') {
          compressStream = zlib.createGzip();
        } else if (compressionType === 'deflate') {
          compressStream = zlib.createDeflate();
        } else if (compressionType === 'br') {
          compressStream = zlib.createBrotliCompress();
        }

        readStream.on('error', (err) => {
          /* eslint-disable-next-line no-console */
          console.error('File reading error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('File reading error.');
        });

        compressStream.on('error', (err) => {
          /* eslint-disable-next-line no-console */
          console.error('Compression error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Compression error.');
        });

        readStream.pipe(compressStream).pipe(res);
      });
    } else if (req.url === '/compress' && req.method === 'GET') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('POST request expected.');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
}

module.exports = {
  createServer,
};
