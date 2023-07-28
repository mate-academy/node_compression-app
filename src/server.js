'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHeader(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      } else {
        res.writeHeader(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else if (req.url === '/upload' && req.method === 'POST') {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const data = Buffer.concat(chunks).toString();

      const compressionType = data.slice(data.indexOf('"compressions"') + 15)
        .trim()[0];

      let compressionStream;
      let compressionName;

      switch (compressionType) {
        case 'g':
          compressionStream = zlib.createGzip();
          compressionName = 'gzip';
          break;
        case 'b':
          compressionStream = zlib.createBrotliCompress();
          compressionName = 'brotli';
          break;
        case 'd':
          compressionStream = zlib.createDeflate();
          compressionName = 'deflate';
          break;
      }

      const fileName = /filename="(.+)"/.exec(data)[1];
      const contetType = /Content-Type: (.+)/.exec(data)[1];

      res.writeHeader(200, {
        // eslint-disable-next-line max-len
        'Content-Disposition': `attachment; filename=${fileName}.{${compressionName}}}`,
        'Content-Type': contetType,
      });

      const dataPart = data.slice(data.indexOf('\r\n\r\n') + 4);
      const dataClean = dataPart.slice(
        0, dataPart.indexOf('------')
      ).trim();

      pipeline(dataClean, compressionStream, res, (err) => {
        if (err) {
          res.writeHeader(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');
        }
      });

      res.on('close', () => {
        compressionStream.destroy();
      });
    });
  } else {
    res.writeHeader(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.on('error', () => {});

server.listen(3000);
