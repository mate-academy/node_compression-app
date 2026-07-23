'use strict';

const { Server } = require('http');
const path = require('path');
const fs = require('fs');
const Busboy = require('busboy');
const zlib = require('zlib');
const { extension } = require('./constants.js');

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    let url;

    try {
      url = new URL(req.url, `http://${req.headers.host}`);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Bad reqiest');
    }

    const requestPath = url.pathname.slice(1) || 'index.html';
    const realPath = path.resolve('public', requestPath);

    if (requestPath === 'index.html') {
      const strim = fs.createReadStream(realPath);

      strim.pipe(res);

      return;
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;

      return res.end('Not found');
    }

    if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');

      return res.end('Expected POST method');
    }

    const ct = req.headers['content-type'] || '';

    if (!ct.startsWith('multipart/form-data')) {
      res.statusCode = 400;

      return res.end('Invalid Form');
    }

    const busboy = Busboy({ headers: req.headers });
    let compressType = '';
    let fileName = '';
    let tempPath = '';
    let fileCount = 0;
    let fileFinished;

    busboy.on('field', (name, val, info) => {
      if (name === 'compressionType') {
        compressType = val;
      }
    });

    busboy.on('file', (name, file, info) => {
      if (name === 'file') {
        fileName = info.filename;
        fileCount += 1;

        tempPath = path.resolve('public', info.filename);

        const writeStream = fs.createWriteStream(tempPath);

        file.pipe(writeStream);

        fileFinished = new Promise((resolve) => {
          writeStream.on('close', resolve);
        });
      }
    });

    busboy.on('finish', async () => {
      let compressStrim;
      let contentType = 'application/octet-stream';

      if (fileCount === 0) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });

        return res.end('Invalid form: no file uploaded');
      }

      switch (compressType) {
        case 'gzip':
          contentType = 'application/gzip';
          compressStrim = zlib.createGzip();
          break;
        case 'deflate':
          contentType = 'application/deflate';
          compressStrim = zlib.createDeflate();
          break;
        case 'br':
          contentType = 'application/br';
          compressStrim = zlib.createBrotliCompress();
          break;
        default:
          res.statusCode = 400;

          return res.end('Unsupported compression type');
      }

      res.writeHead(200, {
        'Content-Encoding': contentType,
        'Content-Disposition': `attachment; filename=${fileName}.${extension[compressType]}`,
      });

      await fileFinished;

      fs.createReadStream(tempPath).pipe(compressStrim).pipe(res);
    });

    req.pipe(busboy);
  });

  return server;
}

module.exports = {
  createServer,
};
