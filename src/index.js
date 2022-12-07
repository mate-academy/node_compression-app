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

function handleIndex(req, res) {
  const index = fs.createReadStream('./src/public/index.html');

  pipeline(index, res, err => {
    if (err) {
      sendAnErr(res, err);
    }
  });
}

function handleSend(req, res) {
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

    switch (compressionType) {
      case 'gzip':
        compressionBox = zlib.createGzip();
        break;
      case 'br':
        compressionBox = zlib.createBrotliCompress();
    }

    pipeline(fileStream, compressionBox, res, error => {
      if (error) {
        sendAnErr(res, error);
      }
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    handleIndex(req, res);
  }

  if (req.url === '/send' && req.method === 'POST') {
    handleSend(req, res);
  }
});

server.listen(8080);
