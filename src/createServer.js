'use strict';

const http = require('http');
const zlib = require('zlib');

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (url === '/' && method === 'GET') {
      res.writeHead(200, { 'Content-type': 'text/html' });

      return res.end(`
        <form action="/compress" method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required>
          <select name="compressionType">
            <option value="gzip">gzip</option>
            <option value="deflate">deflate</option>
            <option value="br">br</option>
          </select>
          <button type="submit">Compress</button>
        </form>
      `);
    }

    if (url !== '/compress') {
      res.statusCode = 404;

      return res.end('The endpoint does not exist');
    }

    if (method === 'GET') {
      res.statusCode = 400;

      return res.end('Only POST requests are allowed');
    }

    if (method === 'POST') {
      const body = [];

      req.on('data', (chunk) => body.push(chunk));

      req.on('end', () => {
        const buffer = Buffer.concat(body);

        const bodyStr = buffer.toString('binary');

        const filenameMatch = bodyStr.match(/filename="(.+?)"/);
        const typeMatch = bodyStr.match(
          /name="compressionType"\r\n\r\n(.+?)\r\n/,
        );

        if (!filenameMatch || !typeMatch) {
          res.statusCode = 400;

          return res.end('Invalid form data');
        }

        const filename = filenameMatch[1];
        const compressionType = typeMatch[1].trim();

        const filePartHeader = bodyStr.match(
          /filename=".+?"\r\nContent-Type: .+?\r\n\r\n/,
        );

        if (!filePartHeader) {
          res.statusCode = 400;

          return res.end('Invalid file part');
        }

        const startIdx =
          bodyStr.indexOf(filePartHeader[0]) + filePartHeader[0].length;
        const boundary = bodyStr.split('\r\n')[0];
        const endIdx = bodyStr.indexOf(boundary, startIdx) - 2;

        const fileBuffer = buffer.slice(startIdx, endIdx);

        const validTypes = {
          gzip: { method: zlib.gzipSync, ext: 'gzip' },
          deflate: { method: zlib.deflateSync, ext: 'deflate' },
          br: { method: zlib.brotliCompressSync, ext: 'br' },
        };

        const config = validTypes[compressionType];

        if (!config) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        try {
          const compressedData = config.method(fileBuffer);

          res.writeHead(200, {
            'Content-type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename=${filename}.${config.ext}`,
          });

          res.end(compressedData);
        } catch (err) {
          res.statusCode = 400;
          res.end('Compression failed');
        }
      });
    }
  });
}

module.exports = { createServer };
