'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const port = 5500;

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', fileName);

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end('File not found');

    return;
  }

  if (filePath === 'download' && req.method.toUpperCase() === 'POST') {
    const fileStream = fs.createReadStream(filePath);

    switch (res.headers['content-encoding']) {
      case 'br':
        fileStream.pipe(zlib.createBrotliCompress()).pipe(res);
        break;

      case 'deflate':
        fileStream.pipe(zlib.createDeflate()).pipe(res);
        break;

      default:
        fileStream.pipe(zlib.createGzip()).pipe(res);
    }

    fileStream.on('error', (err) => {
      res.statusCode = 500;
      res.end(`Server error: ${err}`);
    });

    res.on('close', () => fileStream.destroy());
  }
});

server.on('error', () => {});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is listening on http://localhost:${port}`);
});
