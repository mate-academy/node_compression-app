'use strict';

const http = require('http');
const zlib = require('zlib');
const { pipeline, Readable } = require('stream');

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;

      return res.end('OK');
    }

    if (url.pathname !== '/compress') {
      res.statusCode = 404;

      return res.end('Not Found');
    }

    if (req.method === 'GET') {
      res.statusCode = 400;

      return res.end('Bad Request');
    }

    // Збираємо тіло запиту в один Buffer (бінарно)
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));

    req.on('end', () => {
      const fullBody = Buffer.concat(chunks);
      // Перетворюємо в рядок тільки для пошуку метаданих,
      // але сам файл будемо витягувати як Buffer
      const bodyString = fullBody.toString('binary');

      // 1. Витягуємо тип стиснення
      // Шукаємо рядок після name="compressionType"
      const compMatch = bodyString.match(/name="compressionType"\r\n\r\n(\w+)/);
      const compressionType = compMatch ? compMatch[1].trim() : null;

      // 2. Витягуємо файл та його назву
      // Шукаємо назву файлу
      const filenameMatch = bodyString.match(/name="file"; filename="(.+?)"/);
      const filename = filenameMatch ? filenameMatch[1] : null;

      // Знаходимо початок і кінець вмісту файлу
      // Вміст файлу починається після \r\n\r\n після заголовків частини
      const fileHeaderMarker = 'name="file"';
      const headerEndIndex =
        bodyString.indexOf('\r\n\r\n', bodyString.indexOf(fileHeaderMarker)) +
        4;

      // Кінець файлу — це наступний розділювач (починається з --)
      const boundary = req.headers['content-type'].split('boundary=')[1];
      const footerStartIndex =
        bodyString.indexOf('--' + boundary, headerEndIndex) - 2; // -2 для \r\n

      if (
        !compressionType ||
        !filename ||
        headerEndIndex < 4 ||
        footerStartIndex < 0
      ) {
        res.statusCode = 400;

        return res.end('Bad Request: Invalid Form');
      }

      const fileContent = fullBody.slice(headerEndIndex, footerStartIndex);

      // 3. Налаштовуємо стиснення
      let compressStream;

      if (compressionType === 'gzip') {
        compressStream = zlib.createGzip();
      } else if (compressionType === 'deflate') {
        compressStream = zlib.createDeflate();
      } else if (compressionType === 'br') {
        compressStream = zlib.createBrotliCompress();
      } else {
        res.statusCode = 400;

        return res.end('Unsupported compression type');
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}.${compressionType}`,
      );
      res.statusCode = 200;

      // Пускаємо потік: Buffer -> Stream -> Zlib -> Response
      pipeline(Readable.from(fileContent), compressStream, res, (err) => {
        if (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end();
          }
        }
      });
    });
  });
}

module.exports = { createServer };
