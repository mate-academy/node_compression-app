'use strict';

const zlib = require('node:zlib');
const http = require('node:http');
const { Transform } = require('node:stream');

class MultipartStream extends Transform {
  constructor(boundaryString) {
    super();
    this.buffer = Buffer.alloc(0);
    this.isHeaderParsed = false;
    this.boundaryEnd = Buffer.from(`\r\n--${boundaryString}`);
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    if (!this.isHeaderParsed) {
      const fileIdx = this.buffer.indexOf('filename="');

      if (fileIdx !== -1) {
        const headerEnd = this.buffer.indexOf('\r\n\r\n', fileIdx);

        if (headerEnd !== -1) {
          const startIdx = headerEnd + 4;
          const str = this.buffer.toString('utf8');

          const cMatch = str.match(
            /name="compressionType"\r\n\r\n(gzip|deflate|br)/,
          );
          const fMatch = str.match(/filename="([^"]+)"/);

          if (cMatch && fMatch) {
            this.isHeaderParsed = true;

            this.emit('fileReady', {
              compressionType: cMatch[1],
              filename: fMatch[1],
            });
            this.buffer = this.buffer.subarray(startIdx);
          }
        }
      }

      if (!this.isHeaderParsed && this.buffer.length > 1024 * 1024) {
        this.emit('error', new Error('Invalid form data or headers too large'));

        return callback();
      }
    }

    // Шаг 2: Стримим чистый файл
    if (this.isHeaderParsed) {
      const endIdx = this.buffer.indexOf(this.boundaryEnd);

      if (endIdx !== -1) {
        this.push(this.buffer.subarray(0, endIdx));
        this.buffer = Buffer.alloc(0);
        this.push(null);
      } else {
        if (this.buffer.length > this.boundaryEnd.length) {
          const safeLen = this.buffer.length - this.boundaryEnd.length;

          this.push(this.buffer.subarray(0, safeLen));
          this.buffer = this.buffer.subarray(safeLen);
        }
      }
    }

    callback();
  }

  _flush(callback) {
    if (!this.isHeaderParsed) {
      this.emit('error', new Error('Missing file or compression type'));
    }
    callback();
  }
}

function createServer() {
  const server = http.createServer();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const reqPath = url.pathname;

    if (reqPath === '/' && req.method === 'GET') {
      res.statusCode = 200;

      return res.end();
    }

    if (reqPath !== '/compress') {
      res.statusCode = 404;

      return res.end('Not Found');
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;

      return res.end('Bad Request');
    }

    // Достаем уникальную границу (boundary) из заголовков запроса
    const boundaryMatch = req.headers['content-type']?.match(/boundary=(.*)/);

    if (!boundaryMatch) {
      res.statusCode = 400;

      return res.end('Bad Request: Not a multipart form');
    }

    const boundaryStr = boundaryMatch[1].replace(/"/g, '');

    const formParser = new MultipartStream(boundaryStr);

    formParser.on('fileReady', ({ compressionType, filename }) => {
      let resFile = null;
      let ext = '';

      switch (compressionType) {
        case 'gzip':
          resFile = zlib.createGzip();
          ext = '.gz';
          break;
        case 'deflate':
          resFile = zlib.createDeflate();
          ext = '.dfl';
          break;
        case 'br':
          resFile = zlib.createBrotliCompress();
          ext = '.br';
          break;
      }

      res.statusCode = 200;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}${ext}`,
      );

      resFile.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
        }
        res.end('Compression Error');
      });

      // Соединяем трубы: Парсер -> Архиватор -> Клиент
      formParser.pipe(resFile).pipe(res);
    });

    formParser.on('error', (err) => {
      if (!res.headersSent) {
        res.statusCode = 400;
        res.end(`Bad Request: ${err.message}`);
      }
    });

    // Начинаем заливать данные из запроса в наш парсер
    req.pipe(formParser);

    req.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Request Error');
      }
    });
  });

  return server;
}

module.exports = {
  createServer,
};
