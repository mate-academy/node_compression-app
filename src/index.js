/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const formidable = require('formidable');

const PORT = process.env.POR || 8080;

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/send' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;

        res.end('Something went wrong');

        return;
      }

      let compression;
      let type;

      switch (fields.compression) {
        case 'brotli':
          type = '.br';
          compression = zlib.createBrotliCompress();
          break;

        case 'deflate':
          type = '.dfl';
          compression = zlib.createDeflate();
          break;

        default:
          type = '.gzip';
          compression = zlib.createGzip();
          break;
      }

      res.setHeader('Content-Encoding', type);

      const file = fs.createReadStream(files.file.filepath);

      file
        .on('error', () => {
          res.statusCode = 500;
          res.end('Error with reading');
        })
        .pipe(compression)
        .on('error', () => {
          res.statusCode = 500;
          res.end('Error with compression');
        })
        .pipe(res)
        .on('error', () => {
          res.statusCode = 500;
          res.end('Error with sending');
        })
        .on('finish', () => {
          res.statusCode = 200;
          res.end();
        });

      const nameOfFile = files.file.originalFilename.split('.')[0] + type;

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader('Content-Disposition',
        `attachment; filename=${nameOfFile}`,
      );
    });
  } else {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File does not exist');

      return;
    }

    res.setHeader('Content-Type', 'text/html');

    const file = fs.createReadStream(filePath);

    file.pipe(res);

    file.on('error', () => {
      res.statusCode = 500;
      res.end('Server error');
    });

    res.on('close', () => {
      file.destroy();
    });
  }
});

server.on('error', (error) => {
  console.log(error);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
