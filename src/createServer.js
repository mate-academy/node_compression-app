'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const formidable = require('formidable');

/**
 * Creates an HTTP server that handles file compression requests.
 * @returns {http.Server} The configured HTTP server.
 */
function createServer() {
  const server = http.createServer((req, res) => {
    // Обробляємо запит на головну сторінку
    if (req.method === 'GET' && req.url === '/') {
      const indexPath = path.join(__dirname, 'index.html');

      fs.readFile(indexPath, (err, data) => {
        if (err) {
          res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' });
          res.end('404 Not Found: index.html not found');

          return;
        }
        res.writeHead(200, 'OK', { 'Content-Type': 'text/html' });
        res.end(data);
      });

      return;
    }

    // Обробляємо неіснуючі маршрути (404)
    if (req.url !== '/compress') {
      res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');

      return;
    }

    // Обробляємо GET-запити до /compress (400)
    if (req.method === 'GET') {
      res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
      res.end('400 Bad Request: Use POST method to /compress');

      return;
    }

    // Обробляємо POST-запит до /compress
    const form = new formidable.IncomingForm({
      multiples: false,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
        res.end('400 Bad Request: Error parsing form');

        return;
      }

      // Перевіряємо валідність форми
      const compressionType = Array.isArray(fields.compressionType)
        ? fields.compressionType[0]
        : fields.compressionType;
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!compressionType || !file) {
        res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });

        res.end(
          '400 Bad Request: Missing required fields (file or compressionType)',
        );

        return;
      }

      const supportedTypes = ['gzip', 'deflate', 'br'];

      if (!supportedTypes.includes(compressionType)) {
        res.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
        res.end('400 Bad Request: Unsupported compression type');

        return;
      }

      const originalName = path.basename(
        file.originalFilename || 'unknown.txt',
      );
      const extension =
        compressionType === 'gzip'
          ? '.gzip'
          : compressionType === 'deflate'
            ? '.deflate'
            : '.br';
      const compressedFileName = `${originalName}${extension}`;

      // Визначаємо метод стиснення
      let compressor;

      if (compressionType === 'gzip') {
        compressor = zlib.createGzip();
      } else if (compressionType === 'deflate') {
        compressor = zlib.createDeflate();
      } else {
        compressor = zlib.createBrotliCompress();
      }

      // Налаштовуємо заголовки для скачування файлу без лапок
      res.writeHead(200, 'OK', {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${compressedFileName}`, // Видалено лапки
      });

      // Створюємо потоки для читання, стиснення і запису у відповідь
      const readStream = fs.createReadStream(file.filepath);

      // eslint-disable-next-line no-shadow
      pipeline(readStream, compressor, res, (err) => {
        if (err) {
          if (!res.writableEnded) {
            res.writeHead(500, 'Internal Server Error', {
              'Content-Type': 'text/plain',
            });
            res.end('500 Internal Server Error');
          }
        } else if (!res.writableEnded) {
          res.end(); // Гарантуємо закриття відповіді
        }
      });
    });
  });

  return server;
}

module.exports = {
  createServer,
};
