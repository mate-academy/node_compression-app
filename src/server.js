'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const formidable = require('formidable');

const PATHS = {
  index: 'GET /',
  upload: 'POST /upload',
};

const server = new http.Server();

server.on('request', (req, res) => {
  switch (req.method + ' ' + req.url) {
    case PATHS.index:
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHeader(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');
        } else {
          res.writeHeader(200, { 'Content-Type': 'text/html' });
          res.end(data);
        }
      });
      break;

    case PATHS.upload:
      const form = new formidable.IncomingForm({});

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHeader(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');

          return;
        }

        let fileName;
        let compressionStream;

        switch (fields.compressions) {
          case 'gzip':
            compressionStream = zlib.createGzip();
            fileName = files.file.originalFilename + '.gz';
            break;
          case 'brotli':
            compressionStream = zlib.createBrotliCompress();
            fileName = files.file.originalFilename + '.br';
            break;
          case 'deflate':
            compressionStream = zlib.createDeflate();
            fileName = files.file.originalFilename + '.deflate';
            break;
        }

        res.writeHeader(200, {
          'Content-Disposition': `attachment; filename=${fileName}`,
          'Content-Type': files.file.mimetype,
        });

        pipeline(
          fs.ReadStream(files.file.filepath),
          compressionStream, res, (pipelineErr) => {
            if (pipelineErr) {
              res.writeHeader(500, { 'Content-Type': 'text/plain' });
              res.end('Internal server error');
            }
          });

        res.on('close', () => {
          compressionStream.destroy();
        });
      });

      break;

    default:
      res.writeHeader(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
  }
});

server.on('error', () => {});

// eslint-disable-next-line no-console
server.listen(3000, () => console.log('Server started'));
