'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');

const PATHS = {
  index: 'GET /',
  upload: 'POST /upload',
};

const server = new http.Server();

server.on('request', (req, res) => {
  switch (req.method + ' ' + req.url) {
    case PATHS.index:
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
      break;

    case PATHS.upload:
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
          'Content-Disposition': `attachment; filename=${fileName}.${compressionName}`,
          'Content-Type': contetType,
        });

        const dataPart = data.slice(data.indexOf('\r\n\r\n') + 4);
        const dataClean = dataPart.slice(
          0, dataPart.indexOf('------')
        ).trim();
        // ------ is the beginning of the next part of the request
        // so we need to cut it off

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
      break;

    default:
      res.writeHeader(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
  }
});

server.on('error', () => {});

// eslint-disable-next-line no-console
server.listen(3000, () => console.log('Server started'));
