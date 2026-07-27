'use strict';

const http = require('http');
const fs = require('fs');
const { formidable } = require('formidable');
const zlib = require('zlib');

const COMPRESSION_TYPES = ['gzip', 'deflate', 'br'];

const ZLIB_COMPRESSOR = {
  gzip: { formatter: () => zlib.createGzip(), format: 'gz' },
  deflate: { formatter: () => zlib.createDeflate(), format: 'dfl' },
  br: { formatter: () => zlib.createBrotliCompress(), format: 'br' },
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.slice(1);

    if (pathname === 'compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end('Bad request');

        return;
      }

      const form = formidable({ multiples: false });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end('Bad request');

          return;
        }

        const compressionType =
          fields.compressionType?.[0] ?? fields.compressionType;
        const file = files.file?.[0] ?? files.file;

        if (
          !file ||
          !file.filepath ||
          !compressionType ||
          !COMPRESSION_TYPES.includes(compressionType)
        ) {
          res.statusCode = 400;
          res.end('Bad request');

          return;
        }

        const ext = ZLIB_COMPRESSOR[compressionType].format;
        const fileStream = fs.createReadStream(file.filepath);

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.${ext}`,
        );

        fileStream.pipe(ZLIB_COMPRESSOR[compressionType].formatter()).pipe(res);
      });
    } else if (pathname === '') {
      res.end(`
        <body>
          <h1>Choose File and Compress</h1>

          <form action="/compress" method="post" enctype="multipart/form-data">
            <input type="file" name="file" />

            <select name="compressionType">
              <option value="gzip">GZIP</option>
              <option value="deflate">DEFLATE</option>
              <option value="br">BR</option>
            </select>

            <button type="submit">Compress</button>
          </form>
        </body>
      `);
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
