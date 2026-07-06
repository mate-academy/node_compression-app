'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream'); // Додаємо модуль для створення потоку

const htmlForm = `
<!DOCTYPE html>
<html lang="en">
<body>
  <form action="/compress" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required />
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

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    // 1. Головна сторінка
    if (url === '/' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlForm);

      return;
    }

    // 2. Обробка стиснення
    if (url === '/compress') {
      // Вимога: 400 status code for GET request to /compress
      if (method === 'GET') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      if (method === 'POST') {
        const contentType = req.headers['content-type'] || '';

        // Вимога: 400 status code if the form is invalid
        if (!contentType.includes('multipart/form-data')) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const boundaryStr = contentType.split('boundary=')[1];

        if (!boundaryStr) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const chunks = [];

        req.on('data', (chunk) => chunks.push(chunk));

        req.on('end', () => {
          const buffer = Buffer.concat(chunks);

          const bodyStr = buffer.toString('latin1');
          const parts = bodyStr.split(boundaryStr);

          let compressionType = '';
          let fileName = '';
          let fileContentBuffer = null;

          // Розбираємо частини форми
          for (const part of parts) {
            if (part.includes('name="compressionType"')) {
              const val = part.split('\r\n\r\n')[1];

              if (val) {
                compressionType = val.split('\r\n')[0].trim();
              }
            } else if (part.includes('name="file"')) {
              const nameMatch = part.match(/filename="(.+?)"/);

              if (nameMatch) {
                fileName = nameMatch[1];
              }

              const headerEnd = part.indexOf('\r\n\r\n');

              if (headerEnd !== -1) {
                // Вирізаємо чистий вміст файлу
                const contentStr = part.substring(
                  headerEnd + 4,
                  part.lastIndexOf('\r\n'),
                );

                fileContentBuffer = Buffer.from(contentStr, 'latin1');
              }
            }
          }

          if (!fileName || !fileContentBuffer || !compressionType) {
            res.statusCode = 400;
            res.end('Invalid form data');

            return;
          }

          // Налаштування Zlib та розширень файлу
          let transformStream;
          let ext = '';

          if (compressionType === 'gzip') {
            transformStream = zlib.createGzip();
            ext = '.gz';
          } else if (compressionType === 'deflate') {
            transformStream = zlib.createDeflate();
            ext = '.dfl';
          } else if (compressionType === 'br') {
            transformStream = zlib.createBrotliCompress();
            ext = '.br';
          } else {
            // Вимога: 400 status code for unsupported compression type
            res.statusCode = 400;
            res.end('Unsupported compression type');

            return;
          }

          // Встановлюємо заголовки для завантаження файлу
          res.writeHead(200, {
            'Content-Disposition': `attachment; filename=${fileName}${ext}`,
            'Content-Type': 'application/octet-stream',
          });

          Readable.from(fileContentBuffer).pipe(transformStream).pipe(res);
        });

        return;
      }
    }

    // 3. Вимога: 404 status code for non-existent endpoint
    res.statusCode = 404;
    res.end('Not Found');
  });
}

module.exports = { createServer };
