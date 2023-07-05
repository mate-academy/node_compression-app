'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const multiparty = require('multiparty');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const pathFileIndexHTML = path.join(__dirname, 'index.html');

    const readStream = fs.createReadStream(pathFileIndexHTML);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    readStream.pipe(res);

    readStream.on('error', (err) => {
      res.statusCode = 404;
      res.end(err);
    });

    return;
  }

  if (req.url === '/compress') {
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 404;
        res.end('Error');

        return;
      }

      const file = files.file[0];
      const compress = fields.compress[0];

      const fileName = file.originalFilename.split('.')[0];

      const readableStream = fs.createReadStream(file.path);

      let compressionStream;

      switch (compress) {
        case 'gzip':
          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}.gz`,
          );
          compressionStream = zlib.createGzip();
          break;
        case 'deflate':
          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}.deflate`,
          );
          compressionStream = zlib.createDeflate();
          break;
        case 'br':
          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}.br`,
          );
          compressionStream = zlib.createBrotliCompress();
          break;
        default:
          res.statusCode = 400;
          res.end('Invalid compression type');

          return;
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      readableStream.pipe(compressionStream).pipe(res);

      readableStream.on('data', (chunk) => {
        // eslint-disable-next-line no-console
        console.log(`Receive data: ${chunk.length} of bytes`);
      });

      readableStream.on('end', () => {
        // eslint-disable-next-line no-console
        console.log('End of stream');
      });
    });
  }
});

server.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Server running on port http://localhost:3000');
});
