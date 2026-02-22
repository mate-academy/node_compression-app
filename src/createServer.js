'use strict';

/* eslint-disable no-console */

const http = require('http');
const { readFile } = require('fs');
const path = require('path');
const zlib = require('zlib');

const compressTypes = {
  gzip: {
    stream: zlib.createGzip,
    extention: '.gz',
  },
  deflate: {
    stream: zlib.createDeflate,
    extention: '.dfl',
  },
  br: {
    stream: zlib.createBrotliCompress,
    extention: '.br',
  },
};

function createServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');

      readFile(path.resolve(__dirname, 'index.html'), 'utf8', (err, data) => {
        if (err) {
          console.error(err);

          return;
        }

        return res.end(data);
      });
    } else if (req.url === '/compress') {
      if (req.method === 'POST') {
        let startedStream = false;
        let fileName = '';
        let compressToType = '';
        let compressor;

        req.on('data', (chunk) => {
          if (!startedStream) {
            const chunkStr = chunk.toString();
            const startIdx = chunkStr.lastIndexOf('\r\n\r\n');
            const headers = chunkStr.slice(0, startIdx);

            const compressionMatch = headers.match(
              /name="compressionType"\r\n\r\n([^\r\n]+)/,
            );
            const fileNameMatch = headers.match(/filename="([^"]+)"/);

            if (compressionMatch) {
              compressToType = compressionMatch[1];
            }

            if (fileNameMatch) {
              fileName = fileNameMatch[1];
            }

            if (
              !compressToType ||
              !compressTypes.hasOwnProperty(compressToType) ||
              !fileName
            ) {
              res.statusCode = 400;
              res.end('Provide file and valid compression type!');

              return;
            }

            const fileChunk = chunk.slice(startIdx + 4);

            startedStream = true;

            res.writeHead(200, {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename=${fileName}${compressTypes[compressToType].extention}`,
            });

            compressor = compressTypes[compressToType].stream();
            compressor.pipe(res);
            compressor.write(fileChunk);
          } else {
            compressor.write(chunk);
          }
        });

        req.on('end', () => {
          if (compressor) {
            compressor.end();
          }
        });
      } else {
        res.statusCode = 400;

        return res.end();
      }
    } else {
      res.statusCode = 404;

      return res.end();
    }
  });

  return server;
}

module.exports = {
  createServer,
};
