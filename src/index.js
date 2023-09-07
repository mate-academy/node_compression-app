'use strict';

const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const path = require('path');
const pipeline = require('stream');

const PORT = process.env.PORT || 3000;

;

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', fileName);

  res.setHeader('Content-Encoding', 'gzip');

  const file = fs.createReadStream(filePath);
  const gzip = zlib.createGzip();

  let extension;

  gzip.pipe(fs.createWriteStream(filePath + extension));

  res.on('close', () => {
    file.destroy();
  });

  pipeline(file, gzip, res, (error) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Something went wrong');
    }
  });
});

server.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error(error);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
