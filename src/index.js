/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const server = http.createServer(async(req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/upload' && req.method === 'POST') {
    const compressionType = url.searchParams.get('compressionType') || 'gzip';

    try {
      const compressedFilePath = path.join(__dirname, 'compressed_file.txt');

      const compressionStream = getCompressionStream(compressionType);

      const fileReadStream = req;

      const compressedFileStream = fs.createWriteStream(compressedFilePath);

      fileReadStream.pipe(compressionStream).pipe(compressedFileStream);

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader(
        'Content-Disposition', 'attachment; filename="compressed_file.txt"');

      const compressedFileReadStream = fs.createReadStream(compressedFilePath);

      compressedFileReadStream.pipe(res);
    } catch (error) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  } else if (url.pathname === '/') {
    const htmlContent = fs.readFileSync(
      path.join(__dirname, '../public', 'index.html'), 'utf-8');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

function getCompressionStream(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'brotli':
      const iltorb = require('iltorb');

      return iltorb.compressStream();
    default:
      return zlib.createGzip();
  }
}

server.listen(3006, () => {
  console.log('Server is running on port 3006');
});
