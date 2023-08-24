/* eslint-disable no-console */
'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const multer = require('multer');
const { Readable } = require('stream');

const PORT = 4200;
const server = new http.Server();
const upload = multer();

server.on('request', (req, res) => {
  if (req.method === 'POST') {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.statusCode = 400;
        res.end('File cannot be uploaded');

        return;
      }

      const fileStream = new Readable();

      fileStream.push(req.file.buffer);
      fileStream.push(null);

      const compressionStream = req.body.compression === 'gzip'
        ? zlib.createGzip()
        : zlib.createDeflate();

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${req.file.originalname}`,
      );
      res.setHeader('Content-Type', 'application/octet-stream');

      fileStream
        .pipe(compressionStream)
        .pipe(res)
        .on('finish', () => {
          res.end();
        })
        .on('error', (error) => {
          res.statusCode = 400;
          res.end(`Something went wrong: ${error}`);
        });
    });

    return;
  }

  const filePath = path.join('public', 'index.html');
  const file = fs.createReadStream(filePath);

  file.pipe(res);

  file.on('error', () => {
    res.statusCode = 500;
    res.end('Server error');
  });

  res.on('close', () => {
    file.destroy();
  });
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
