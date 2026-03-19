'use strict';

const http = require('http');
const zlib = require('zlib');
const Busboy = require('busboy');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200;

      return res.end('OK');
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;

      return res.end('Not Found');
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;

      return res.end('Only POST allowed!');
    }

    let busboy;

    try {
      busboy = Busboy({ headers: req.headers });
    } catch (err) {
      res.statusCode = 400;

      return res.end('Invalid Content-Type');
    }

    let filename = '';
    let compressionType = '';
    let filesStream = null;
    let gotFile = false;

    busboy.on('field', (name, val) => {
      if (name === 'compressionType') {
        compressionType = val;
      }
    });

    busboy.on('file', (fieldname, stream, info) => {
      if (fieldname === 'file') {
        gotFile = true;
        filename = info.filename;
        filesStream = stream;

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

    busboy.on('finish', () => {
      if (!gotFile || !compressionType) {
        if (filesStream) {
          filesStream.resume();
        }
        res.statusCode = 400;

        return res.end('Invalid Form');
      }

      let compressStream;

      if (compressionType === 'gzip') {
        compressStream = zlib.createGzip();
      } else if (compressionType === 'deflate') {
        compressStream = zlib.createDeflate();
      } else if (compressionType === 'br') {
        compressStream = zlib.createBrotliCompress();
      } else {
        filesStream.resume();
        res.statusCode = 400;

        return res.end('Unsupported compression type');
      }

      compressStream.on('error', () => {
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end('Compression error');
        }
      });

      res.writeHead(200, {
        'Content-Disposition': `attachment; filename=${filename}.${compressionType}`,
        'Content-Type': 'application/octet-stream',
      });

      filesStream.pipe(compressStream).pipe(res);
    });

    busboy.on('error', () => {
      if (!res.writableEnded) {
        res.statusCode = 400;
        res.end('Busboy error');
      }
    });

    req.pipe(busboy);
  });

  return server;
}

module.exports = {
  createServer,
};
