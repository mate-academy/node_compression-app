'use strict';

const http = require('http');
const zlib = require('zlib');
const { pipeline } = require('stream');

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

    if (method !== 'POST') {
      res.statusCode = 400;

      return res.end('Only POST requests are allowed');
    }

    const urlParams = new URL(url, `http://${req.headers.host}`);
    const compressionType =
      urlParams.searchParams.get('compressionType') ||
      req.headers['x-compression-type'] ||
      'gzip';

    const validTypes = {
      gzip: { create: zlib.createGzip, ext: 'gz' },
      deflate: { create: zlib.createDeflate, ext: 'dfl' },
      br: { create: zlib.createBrotliCompress, ext: 'br' },
    };

    const config = validTypes[compressionType];

    if (!config) {
      res.statusCode = 400;

      return res.end('Unsupported compression type');
    }

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="file.${config.ext}"`,
    });

    pipeline(req, config.create(), res, (err) => {
      if (err) {
        if (!res.headersSent) {
          res.statusCode = 400;
          res.end('Compression failed');
        } else {
          res.end();
        }
      }
    });
  });
}

module.exports = { createServer };
