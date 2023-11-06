'use strict';

const http = require('http');
const zlib = require('zlib');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/compress') {
    let fileToCompress = Buffer.alloc(0);

    req.on('data', chunk => {
      fileToCompress = Buffer.concat([fileToCompress, chunk]);
    });

    req.on('end', () => {
      let compression;
      const fields = {
        compression: 'gzip',
      };

      switch (fields.compression) {
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
        compression.flush(zlib.Z_SYNC_FLUSH, () => {
          compression.end();

          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="compressed_file.${fields.compression}"`,
          });
          compression.pipe(res);
        });
      });
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3010);
