'use strict';

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const Busboy = require('busboy');
const { PassThrough } = require('stream');
const { pipeline } = require('stream');

function createServer() {
  const server = http.createServer((req, res) => {
    const normalizedUrl = new url.URL(
      req.url || '',
      `http://${req.headers.host}`,
    );

    function selectCompressor(type) {
      switch (type) {
        case 'gzip':
          return zlib.createGzip();
        case 'deflate':
          return zlib.createDeflate();
        case 'br':
          return zlib.createBrotliCompress();
        default:
          return null;
      }
    }

    const types = {
      gzip: '.gz',
      deflate: '.dfl',
      br: '.br',
    };

    let cleaned = false;

    function cleanup(pass, busboy, compressor = null) {
      if (cleaned) {
        return;
      }

      cleaned = true;

      if (pass && typeof pass.destroy === 'function') {
        pass.destroy();
      }

      if (compressor && typeof compressor.destroy === 'function') {
        compressor.destroy();
      }

      if (busboy && typeof busboy.removeAllListeners === 'function') {
        busboy.removeAllListeners();
      }

      if (req && typeof req.unpipe === 'function') {
        req.unpipe(busboy);
      }
    }

    if (normalizedUrl.pathname === '/compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end(`${res.statusCode}: Bad Request`);

        return;
      }

      const busboy = new Busboy({ headers: req.headers });

      let pass = null;
      let fileInfo = null;
      let compressionType = null;
      let isValid = false;
      let gotType = false;
      const validType = ['gzip', 'deflate', 'br'];

      busboy.on('file', (fieldname, file, info) => {
        if (fieldname !== 'file') {
          isValid = false;
          file.resume();

          return;
        }

        fileInfo = info;
        pass = new PassThrough();

        file.on('error', () => {
          pass.destroy();
        });

        pass.on('error', () => {
          pass.destroy();
        });

        file.pipe(pass);
        isValid = true;
      });

      busboy.on('field', (name, value) => {
        if (name !== 'compressionType') {
          return;
        }

        if (gotType) {
          return;
        }

        if (!validType.includes(value)) {
          return;
        }

        compressionType = value;
        gotType = true;
      });

      busboy.on('finish', () => {
        if (!gotType) {
          res.statusCode = 400;
          res.end('Missing or invalid compressionType');

          return;
        }

        if (!isValid) {
          res.statusCode = 400;
          res.end('Invalid file field');

          return;
        }

        if (!pass || !fileInfo.filename) {
          res.statusCode = 400;
          res.end('Missing file stream or filename');

          return;
        }

        const { filename } = fileInfo;
        const compressor = selectCompressor(compressionType);

        if (!compressor) {
          res.statusCode = 400;
          res.end('Unsupported compression type');
          cleanup(pass, busboy, compressor);

          return;
        }

        compressor.on('error', (err) => {
          cleanup(pass, busboy, compressor);

          if (!res.headersSent && !res.writableEnded) {
            res.statusCode = 400;
            res.end(`Stream error: ${String(err)}`);
          } else {
            res.destroy(err);
          }
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename + types[compressionType]}"`,
        );

        pipeline(pass, compressor, res, (err) => {
          if (err) {
            cleanup(pass, busboy, compressor);

            if (!res.writableEnded && !res.headersSent) {
              res.statusCode = 400;
              res.end(`Pipeline error: ${String(err)}`);
            } else {
              res.destroy(err);
            }
          }
        });
      });

      busboy.on('error', (err) => {
        cleanup(pass, busboy);
        res.statusCode = 400;
        res.end(`The form is invalid:${String(err)}`);
      });

      busboy.on('close', () => {
        req.unpipe(busboy);
        busboy.removeAllListeners();
      });

      req.on('error', (err) => {
        cleanup(pass, busboy);
        res.statusCode = 400;
        res.end(`Stream error: ${String(err)}`);
      });

      req.pipe(busboy);

      res.on('close', () => {
        cleanup(pass, busboy);
      });

      req.on('aborted', () => {
        cleanup(pass, busboy);
      });

      return;
    }

    const origin =
      path.basename(normalizedUrl.pathname.slice(1)) || 'index.html';

    const filePathName = path.join(__dirname, '..', 'public', origin);

    if (!fs.existsSync(filePathName)) {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    const firstStream = fs.createReadStream(filePathName);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    firstStream.pipe(res);
  });

  server.on('error', (err) => {
    if (server.listenerCount('error') === 1) {
      // eslint-disable-next-line no-console
      console.log('⚠️ Default server error:', err);
    }
  });

  return server;
}

module.exports = {
  createServer,
};
