'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const busboy = require('busboy');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/favicon.ico') {
      res.statusCode = 204;

      return res.end();
    }

    if (req.url === '/' && req.method === 'GET') {
      const filePath = path.resolve(__dirname, 'index.html');
      const stream = fs.createReadStream(filePath);

      stream.on('error', (err) => {
        /* eslint-disable no-console */
        console.error('Error reading index.html:', err);

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
      // console.log('headers:', req.headers);

      bb = busboy({ headers: req.headers });
    } catch (err) {
      // console.error('Busboy init error:', err);
      res.statusCode = 400;

      return res.end('Invalid Content-Type');
    }

    let filename = '';
    let compressionType = '';
    let filesStream = null;
    let gotFile = false;

    const startCompression = () => {
      if (!gotFile || !compressionType || !filesStream || res.headersSent) {
        return;
      }

      const extensions = {
        gzip: 'gz',
        deflate: 'dfl',
        br: 'br',
      };
      const ext = extensions[compressionType];

      if (!ext) {
        res.statusCode = 400;

        return res.end('Unsupported compression type');
      }

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

      const mimeTypes = {
        gzip: 'application/gzip',
        deflate: 'application/zlib',
        br: 'application/brotli',
      };

      res.statusCode = 200;

      res.setHeader(
        'Content-Type',
        mimeTypes[compressionType] || 'application/octet-stream',
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}.${ext}`,
      );

      filesStream.pipe(compressStream).pipe(res);
    };

    bb.on('field', (name, val) => {
      if (name === 'compressionType') {
        compressionType = val;
        // startCompression();
      }
    });

    bb.on('file', (fieldname, stream, info) => {
      // console.log('Got file:', info.filename);

      if (fieldname === 'file' && compressionType) {
        gotFile = true;
        filename = info.filename;
        filesStream = stream;
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
      // console.log('Request parsing complete.');

      if (!gotFile || !compressionType) {
        if (filesStream) {
          filesStream.resume();
        }

        if (!res.writableEnded) {
          res.statusCode = 400;
          res.end('Invalid Form');
        }
      }
    });

    bb.on('error', () => {
      if (!res.writableEnded) {
        res.statusCode = 400;
        res.end('Busboy error');
      }
    });

    req.on('aborted', () => {
      if (filesStream) {
        filesStream.destroy();
      }
    });

    req.on('error', () => {
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.end('Request error');
      }
    });
    req.pipe(bb);
  });

  return server;
}

module.exports = {
  createServer,
};
