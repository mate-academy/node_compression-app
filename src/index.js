'use strict';

const { randomFillSync } = require('crypto');
const busboy = require('busboy');
const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');

const PORT = 8000;
const server = new http.Server();

const random = (() => {
  const buf = Buffer.alloc(16);

  return () => randomFillSync(buf).toString('hex');
})();

server.on('request', (req, res) => {
  if (req.method === 'POST') {
    const bb = busboy({ headers: req.headers });

    bb.on('file', (name, file, info) => {
      const saveTo = path.join(__dirname, `compressed-${random()}`);
      const gzipCompress = zlib.createGzip();
      const write = fs.createWriteStream(saveTo);


      file.pipe(gzipCompress);
      gzipCompress.pipe(write);
    });

    bb.on('finish', () => {
      res.statusCode = 200;
      res.end('OK');
    });

    bb.on('error', (error) => {
      res.writeHead(400, 'Something wrong');
      res.end(error);
    });

    req.pipe(bb);
  } else if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);
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
