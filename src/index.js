'use strict';

const { randomFillSync } = require('crypto');
const busboy = require('busboy');
const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');

const PORT = 8000;
const server = new http.Server();

server.on('request', (req, res) => {
  let compression;
  let fileName;

  if (req.method === 'POST') {
    const bb = busboy({ headers: req.headers });

    bb.on('field', (name, value) => {
      compression = zlib[value]();
    });

    bb.on('file', (name, file, info) => {
      fileName = `compressed-${info.name}`;

      const saveTo = path.join(__dirname, fileName);
      const write = fs.createWriteStream(saveTo);

      file.pipe(compression);
      compression.pipe(write);
    });

    bb.on('finish', () => {
      res.statusCode = 200;

      res.end(`link to download file: http://localhost:8000/public/${
        fileName}`);
    });

    bb.on('error', (error) => {
      res.writeHead(400, 'Something wrong');
      res.end(error);
    });

    req.pipe(bb);
  } else {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePathName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', filePathName);
    const file = fs.createReadStream(filePath);

    res.setHeader('Content-Type', 'text/html');
    file.pipe(res);

    file.on('error', () => {
      res.writeHead(500, 'Something wrong', {
        'Content-Type': 'text/html',
      });
      res.end('<p>Something wrong</p>');
    });
  }
});

server.listen(PORT);
