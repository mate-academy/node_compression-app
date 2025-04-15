'use strict';

const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const zlib = require('zlib');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.method === 'POST' && req.url === '/compress') {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        const parsed = querystring.parse(body);
        const file = parsed.file;
        const compressionType = parsed.compressionType;

        if (!file) {
          res.statusCode = 400;

          return res.end('File is required');
        }

        if (!fs.existsSync(file)) {
          res.statusCode = 404;

          return res.end('File not found');
        }

        let compressor;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
          default:
            res.statusCode = 400;

            return res.end('Unsupported compression type');
        }

        const fileStream = fs.createReadStream(file);

        res.statusCode = 200;
        res.setHeader('Content-Encoding', compressionType);
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${file}.${compressionType}"`,
        );

        // Перед началом стриминга — устанавливаем заголовки
        fileStream.pipe(compressor).pipe(res);

        res.on('close', () => {
          fileStream.destroy();
          compressor.destroy();
        });
      });

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;

      return res.end('Bad Request');
    }

    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');

      res.end(`<form method="POST" action="/compress">
        <input name="file" type="file">
        <select name="compressionType">
          <option value="gzip">gzip</option>
          <option value="deflate">deflate</option>
          <option value="br">br</option>
        </select>
        <button type="submit">Submit</button>
      </form>`);

      return;
    }
    res.statusCode = 404;
    res.end('Not Found');
  });

  return server;
}

module.exports = {
  createServer,
};
