'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');
const querystring = require('querystring');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && req.url === '/compress') {
    let fileToCompress = Buffer.alloc(0);
    let fields = {};

    req.on('data', chunk => {
      fileToCompress = Buffer.concat([fileToCompress, chunk]);
    });

    req.on('end', () => {
      fields = querystring.parse(fileToCompress.toString());

      const selectedCompression = fields.compression || 'gzip';

      let compression;

      switch (selectedCompression) {
        case 'deflate':
          compression = zlib.createDeflate();
          break;
        case 'zlib':
          compression = zlib.createDeflateRaw();
          break;
        case 'gzip':
        default:
          compression = zlib.createGzip();
          break;
      }

      compression.on('error', err => {
        res.writeHead(500);
        res.end(`Compression Error: ${err}`);
      });

      compression.write(fileToCompress, () => {
        compression.end();
        compression.pipe(res);
      });
    });
  } else if (url.pathname === '/') {
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);
    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res)
      .on('error', error => {
        res.writeHead(500);
        res.end(`File Stream Error: ${error}`);
      });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3010);
