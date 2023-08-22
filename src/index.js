'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const PORT = 5700;

const server = new http.Server();

server.on('request', (req, res) => {
  const filePath = path.resolve('public', 'text.txt');

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end('File is not found');
  }

  res.setHeader('Content-Encoding', 'gzip');

  const file = fs.createReadStream(filePath);
  const gzip = zlib.createGzip();

  file.on('error', () => {
    res.statusCode = 500;
    res.end('Error with server');
  });

  file.pipe(gzip).pipe(res);
  gzip.pipe(fs.createWriteStream(filePath + '.gzib'));

  file.on('close', () => {
    file.destroy();
  });
});

server.listen(PORT, () => {
  process.stdout.write(`Server is working http://localhost:${PORT}`);
});
