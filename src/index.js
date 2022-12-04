'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');

function sendAnErr(res, err) {
  res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
  res.end(String(err));
}

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const index = fs.createReadStream('./src/public/index.html');

    pipeline(index, res, err => {
      if (err) {
        sendAnErr(res, err);
      }
    });
  }

  if (req.url === '/sent' && req.method === 'POST') {
    const form = formidable();

    form.parse(req, (err, fields, files) => {
      if (err) {
        sendAnErr(res, err);

        return;
      }

      const fileStream = fs.createReadStream(files.uploadedFile.filepath);
      let compressionBox;
      const compressionType = fields.compressionType;

      res.setHeader(
        'Content-Disposition',
        `attachment: filename=${files.uploadedFile.originalFilename}`
      );
      // res.setHeader('Content-Encoding', `${compressionType}`);

      switch (compressionType) {
        case 'gzip':
          compressionBox = zlib.createGzip();
          break;
        case 'br':
          compressionBox = zlib.createBrotliCompress();
      }

      pipeline(fileStream, compressionBox, res, error => {
        if (err) {
          sendAnErr(res, error);
        }
      });
    });
  }
});

server.listen(8080);
