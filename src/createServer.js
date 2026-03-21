/* eslint-disable no-console */
'use strict';

const { Server } = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { pipeline } = require('stream');
const zlib = require('zlib');
const formidable = require('formidable');

const compressMap = new Map([
  ['gzip', { compressor: () => zlib.createGzip() }],
  ['deflate', { compressor: () => zlib.createDeflate() }],
  ['br', { compressor: () => zlib.createBrotliCompress() }],
]);

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const requestedPath = url.pathname.slice(1) || 'index.html';
      const realPath = path.join('public', requestedPath);
      const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';
      const form = new formidable.IncomingForm();

      if (requestedPath === 'compress') {
        if (req.method === 'POST') {
          form.parse(req, (err, fields, files) => {
            if (err) {
              console.log('[Error]: ', err);
              res.statusCode = 400;
              res.end('Error: form is invalid');

              return;
            }

            const file = Array.isArray(files.file) ? files.file[0] : files.file;
            const compressionType = Array.isArray(fields.compressionType)
              ? fields.compressionType[0]
              : fields.compressionType;

            if (
              !file ||
              !compressionType ||
              !compressMap.has(compressionType)
            ) {
              res.statusCode = 400;
              res.end('Error: File or compressionType is missing');

              return;
            }

            const inputPath = file.filepath;
            const readStream = fs.createReadStream(inputPath);
            const { compressor } = compressMap.get(compressionType);

            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename=${file.originalFilename}.${compressionType}`,
            });

            pipeline(readStream, compressor(), res, (error) => {
              fs.unlink(file.filepath, () => {});

              if (error) {
                console.log(error);

                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end('Error: Compression failed!');
                } else {
                  res.destroy();
                }
              }
            });

            req.on('close', () => {
              readStream.destroy();
              compressor.destroy();
            });
          });
        } else {
          res.statusCode = 400;
          res.end('Error: Wrong method!');
        }

        return;
      }

      if (!fs.existsSync(realPath)) {
        res.statusCode = 404;
        res.end('Not Found');

        return;
      }

      const html = fs.readFileSync(realPath);

      res.statusCode = 200;
      res.setHeader('Content-Type', mimeType);
      res.end(html);
    } catch (error) {
      res.statusCode = 500;
      res.end('Server Error');
    }
  });

  server.on('error', (error) => {
    console.error('An error occurred:', error);
  });

  return server;
}

module.exports = {
  createServer,
};
