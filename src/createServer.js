/* eslint-disable no-useless-return */
/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function compressFile(filePath, compressionType, callback) {
  const extension =
    compressionType === 'gzip'
      ? '.gzip'
      : compressionType === 'deflate'
        ? '.deflate'
        : '.br';
  const outputFilePath = `${filePath}${extension}`;
  const compressStream =
    compressionType === 'gzip'
      ? zlib.createGzip()
      : compressionType === 'deflate'
        ? zlib.createDeflate()
        : zlib.createBrotliCompress();

  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(outputFilePath);

  input
    .pipe(compressStream)
    .pipe(output)
    .on('finish', () => callback(outputFilePath));
}

function parseMultipartData(body, boundary) {
  const parts = body
    .split(`--${boundary}`)
    .filter((part) => part.trim() !== '' && part !== '--');
  const parsed = {};

  parts.forEach((part) => {
    const headers = part.split('\r\n\r\n')[0];
    const content = part.split('\r\n\r\n')[1]?.trimEnd();

    if (headers.includes('filename')) {
      const match = headers.match(/filename="(.+)"/);

      if (match) {
        parsed.fileName = match[1];
        parsed.fileContent = content;
      }
    } else if (headers.includes('name="compressionType"')) {
      parsed.compressionType = content;
    }
  });

  return parsed;
}

function createServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(path.join(__dirname, '/index.html')).pipe(res);
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('Error requset');
    } else if (req.method === 'POST' && req.url === '/compress') {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        const boundary = req.headers['content-type']
          .split('; ')[1]
          .split('=')[1];

        const { fileName, fileContent, compressionType } = parseMultipartData(
          body,
          boundary,
        );

        if (!fileName || !fileContent || !compressionType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid form data');

          return;
        }

        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, fileContent, 'binary');

        const validTypes = ['gzip', 'deflate', 'br'];

        if (!validTypes.includes(compressionType)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Unsupported compression type');

          return;
        }

        compressFile(filePath, compressionType, (compressedFilePath) => {
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename=${path.basename(compressedFilePath)}`,
          });

          fs.createReadStream(compressedFilePath).pipe(res);
        });
      });

      req.on('error', (err) => {
        console.log('ERROR DANGER', err);
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
