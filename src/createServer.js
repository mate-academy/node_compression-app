'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const busboy = require('busboy');
const { PassThrough } = require('stream'); // 👈 ajout

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      const filePath = path.resolve(__dirname, 'index.html');
      const stream = fs.createReadStream(filePath);

      stream.on('error', () => {
        res.statusCode = 500;

        return res.end('Cannot read index.html');
      });

      res.writeHead(200, { 'Content-Type': 'text/html' });

      return stream.pipe(res);
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;

      return res.end('Not Found');
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;

      return res.end('Only POST allowed!');
    }

    let bb;

    try {
      bb = busboy({ headers: req.headers });
    } catch (err) {
      res.statusCode = 400;

      return res.end('Invalid Content-Type');
    }

    let filename = '';
    let compressionType = '';
    let filesStream = null; // sera un PassThrough
    let gotFile = false;

    const startCompression = () => {
      if (!gotFile || !compressionType || !filesStream || res.headersSent) {
        return;
      }

      let compressStream;
      let contentType = 'application/octet-stream';

      if (compressionType === 'gzip') {
        compressStream = zlib.createGzip();
        contentType = 'application/gzip';
      } else if (compressionType === 'deflate') {
        compressStream = zlib.createDeflate();
        contentType = 'application/zlib';
      } else if (compressionType === 'br') {
        compressStream = zlib.createBrotliCompress();
        contentType = 'application/brotli';
      } else {
        res.statusCode = 400;

        return res.end('Unsupported compression type');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${filename}.${compressionType}`,
      });

      filesStream.pipe(compressStream).pipe(res);
    };

    bb.on('field', (name, val) => {
      if (name === 'compressionType') {
        compressionType = val;
        startCompression();
      }
    });

    bb.on('file', (fieldname, stream, info) => {
      if (fieldname === 'file') {
        gotFile = true;
        filename = info.filename;

        const pass = new PassThrough();

        stream.pipe(pass);
        filesStream = pass;

        startCompression();

        stream.on('error', () => {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.end('File stream error');
          }
        });
      } else {
        stream.resume();
      }
    });

    bb.on('close', () => {
      if (!res.headersSent) {
        res.statusCode = 400;
        res.end('Invalid Form');
      }
    });

    bb.on('error', () => {
      if (!res.writableEnded) {
        res.statusCode = 400;
        res.end('Busboy error');
      }
    });

    req.pipe(bb);
  });

  return server;
}

module.exports = { createServer };
