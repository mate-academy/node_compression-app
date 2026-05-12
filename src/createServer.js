/* eslint-disable no-console */
'use strict';

const http = require('http');
const zlib = require('zlib');
const Busboy = require('busboy');

function parseMultipart(req, callback) {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return callback(new Error('No boundary'), null);
  }

  const result = { fields: {}, file: null };
  let callbackCalled = false;

  const done = (err, value) => {
    if (callbackCalled) {
      return;
    }

    callbackCalled = true;
    callback(err, value);
  };

  let busboy;

  try {
    busboy = Busboy({ headers: req.headers });
  } catch (err) {
    return done(err, null);
  }

  busboy.on('field', (fieldName, value) => {
    result.fields[fieldName] = value;
  });

  busboy.on('file', (fieldName, file, info) => {
    const fileInfo = typeof info === 'object' && info !== null
      ? info
      : {
          filename: arguments[2],
          encoding: arguments[3],
          mimeType: arguments[4],
        };

    result.file = {
      fieldName,
      filename: fileInfo.filename,
      encoding: fileInfo.encoding,
      mimeType: fileInfo.mimeType,
      stream: file,
    };
  });

  busboy.on('error', (err) => done(err, null));
  req.on('error', (err) => done(err, null));
  busboy.on('finish', () => done(null, result));

  req.pipe(busboy);
}

// Розбиває Buffer на масив Buffer-ів по розділювачу
function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let pos = 0;

  while (pos <= buf.length - delimiter.length) {
    if (buf.slice(pos, pos + delimiter.length).equals(delimiter)) {
      parts.push(buf.slice(start, pos));
      pos += delimiter.length;
      start = pos;
    } else {
      pos++;
    }
  }

  parts.push(buf.slice(start));

  return parts;
}

// Шукає позицію послідовності байт у Buffer
function indexOfSequence(buf, seq) {
  for (let i = 0; i <= buf.length - seq.length; i++) {
    if (buf.slice(i, i + seq.length).equals(seq)) {
      return i;
    }
  }

  return -1;
}

const COMPRESSION_MAP = {
  gzip: { create: () => zlib.createGzip(), ext: 'gz' },
  deflate: { create: () => zlib.createDeflate(), ext: 'dfl' },
  br: { create: () => zlib.createBrotliCompress(), ext: 'br' },
};

function createServer() {
  const server = http.createServer((req, res) => {
    const { method, url } = req;

    // GET / → повертаємо HTML форму
    if (method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });

      res.end(`
        <!DOCTYPE html>
        <html>
          <body>
            <form method="POST" action="/compress" enctype="multipart/form-data">
              <input type="file" name="file" />
              <select name="compressionType">
                <option value="gzip">gzip</option>
                <option value="deflate">deflate</option>
                <option value="br">br</option>
              </select>
              <button type="submit">Стиснути</button>
            </form>
          </body>
        </html>
      `);

      return;
    }

    // GET /compress → 400
    if (method === 'GET' && url === '/compress') {
      res.writeHead(400);
      res.end();

      return;
    }

    // Будь-який запит на невідомий шлях → 404
    if (url !== '/compress') {
      res.writeHead(404);
      res.end();

      return;
    }

    // POST /compress → основна логіка
    if (method === 'POST' && url === '/compress') {
      parseMultipart(req, (err, parsed) => {
        if (err || !parsed) {
          res.writeHead(400);

          return res.end();
        }

        const { file, fields } = parsed;
        const compressionType = (fields.compressionType || '').trim();

        // Крок 4: Валідація — файл і тип стиснення обов'язкові
        if (!file) {
          res.writeHead(400);

          return res.end();
        }

        if (!compressionType) {
          res.writeHead(400);

          return res.end();
        }

        if (!COMPRESSION_MAP[compressionType]) {
          res.writeHead(400);

          return res.end();
        }

        // Крок 5: Формуємо ім'я вихідного файлу
        const { create, ext } = COMPRESSION_MAP[compressionType];
        const outputFilename = `${file.filename}.${ext}`;

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${outputFilename}`,
        });

        // Крок 6: Стискаємо через Stream
        // file.data — це Buffer; перетворюємо на Readable stream
        const { Readable } = require('stream');
        const readable = new Readable();

        readable.push(file.data);
        readable.push(null);

        const compressor = create();

        readable.pipe(compressor).pipe(res);
      });

      return;
    }

    // Fallback
    res.writeHead(404);
    res.end();
  });

  return server;
}

module.exports = { createServer };
