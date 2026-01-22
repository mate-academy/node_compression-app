'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const busboy = require('busboy');
const path = require('path');

const HTMLForm =
  '<form action="/compress" method="post" enctype="multipart/form-data">\n' +
  '  <input type="file" name="file" />\n' +
  '\n' +
  '  <select name="compressionType">\n' +
  '    <option value="gzip">gzip</option>\n' +
  '    <option value="deflate">deflate</option>\n' +
  '    <option value="br">brotli</option>\n' +
  '  </select>\n' +
  '\n' +
  '  <button type="submit">Compress</button>\n' +
  '</form>';

const COMPRESSION_VOCABULARY = {
  gzip: 'gz',
  deflate: 'dfl',
  br: 'br',
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/compress') {
      if (req.method === 'GET') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');

        return;
      }

      const bb = busboy({ headers: req.headers });

      let fileInfo;
      let compressionType;
      let writeStream;

      bb.on('file', (_, file, info) => {
        fileInfo = info;

        const uploadDir = path.resolve(__dirname, 'uploads');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir);
        }

        writeStream = fs.createWriteStream(path.join(uploadDir, info.filename));

        file.pipe(writeStream);
      });

      bb.on('field', (_, value) => {
        compressionType = value;
      });

      bb.on('finish', () => {
        if (!fileInfo || !compressionType) {
          res.statusCode = 400;
          res.end('Invalid form data');

          return;
        }

        if (!Object.keys(COMPRESSION_VOCABULARY).includes(compressionType)) {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        writeStream.on('finish', () => {
          let compressor;

          switch (compressionType) {
            case 'br':
              compressor = zlib.createBrotliCompress();
              break;
            case 'deflate':
              compressor = zlib.createDeflate();
              break;
            default:
              compressor = zlib.createGzip();
          }

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileInfo.filename}.${COMPRESSION_VOCABULARY[compressionType]}`,
          );

          fs.createReadStream(
            path.join(__dirname, 'uploads', fileInfo.filename),
          )
            .pipe(compressor)
            .pipe(res);
        });
      });

      req.pipe(bb);

      return;
    } else if (pathname !== '/') {
      res.statusCode = 404;
      res.end('Not found');

      return;
    }

    // Default: serve HTML for other paths
    res.setHeader('Content-Type', 'text/html');
    res.end(HTMLForm);
  });

  server.on('error', (err) => {
    console.log(err); //eslint-disable-line
  });

  return server;
}

module.exports = {
  createServer,
};
