'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const busboy = require('busboy');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/compress') {
      const bb = busboy({ headers: req.headers });

      let compressionType = null;
      // Зберігаємо інформацію про файл та функцію для його обробки
      let fileInfo = null;

      // 1. Обробник 'file': ПРИЗУПИНЯЄМО потік і ЗБЕРІГАЄМО логіку
      bb.on('file', (fieldname, fileStream, filename) => {
        // Запобігаємо обробці більше одного файлу
        if (fileInfo) {
          fileStream.resume();

          return;
        }

        // ПРИЗУПИНЯЄМО потік негайно, щоб не втратити дані
        fileStream.pause();

        // Функція, яка запустить компресію після отримання compressionType
        const processor = () => {
          let compressor;

          if (compressionType === 'gzip') {
            compressor = zlib.createGzip();
          } else if (compressionType === 'deflate') {
            compressor = zlib.createDeflate();
          } else if (compressionType === 'br') {
            compressor = zlib.createBrotliCompress();
          } else {
            res.statusCode = 400;

            return res.end('Unknown compression type');
          }

          // ВИПРАВЛЕННЯ: Використовуємо повне ім'я, як вимагають тести.
          const fileExt = compressionType;

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${filename}.${fileExt}`,
          );

          // ВІДНОВЛЮЄМО потік і підключаємо його
          fileStream.pipe(compressor).pipe(res);
        };

        // Зберігаємо всі дані разом
        fileInfo = { fileStream, filename, processor };

        // Якщо compressionType вже був встановлений
        if (compressionType !== null) {
          fileInfo.processor();
        }
      });

      // 2. Обробник 'field': Отримуємо тип стиснення та ЗАПУСКАЄМО обробку
      bb.on('field', (name, val) => {
        if (name === 'compressionType') {
          compressionType = val;

          // Якщо файл вже був отриманий та призупинений
          if (fileInfo) {
            fileInfo.processor();
          }
        }
      });

      // 3. Обробник 'finish': Перевірка на таймаут/зависання
      bb.on('finish', () => {
        // Якщо не було файлу
        if (!fileInfo) {
          res.statusCode = 400;

          return res.end('No file or compression type received');
        }

        if (compressionType === null) {
          // Споживаємо потік, щоб не зависнути, і завершуємо з помилкою.
          fileInfo.fileStream.resume();
          res.statusCode = 400;

          return res.end('Missing compressionType field');
        }

        // Успішна обробка (потік завершиться через pipe)
      });

      // Обробка помилок Busboy
      bb.on('error', (err) => {
        res.statusCode = 500;
        // ВИПРАВЛЕННЯ: Коректне завершення відповіді повідомленням про помилку
        res.end(`Busboy error: ${err.message}`);
      });

      // Запуск парсингу
      req.pipe(bb);

      return;
    }

    // --- Логіка для GET-запитів ---
    if (req.method === 'GET' && url.pathname === '/compress') {
      res.statusCode = 400;

      return res.end('Use POST');
    }

    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('file dont found');

      return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    fs.createReadStream(filePath).pipe(res);
  });

  return server;
}

createServer().listen(3006);

module.exports = {
  createServer,
};
