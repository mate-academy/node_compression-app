/* eslint-disable no-console */
'use strict';

const http = require('http');
const Busboy = require('busboy');
const zlib = require('zlib');

function createServer() {
  const compressionTypes = {
    gzip: () => zlib.createGzip(),
    deflate: () => zlib.createDeflate(),
    br: () => zlib.createBrotliCompress(),
  };

  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>File Compression</title>
        </head>
        <body>
          <h1>File Compression</h1>
          <form action="/compress" method="POST" enctype="multipart/form-data">
            <div>
              <label for="compressionType">Compression type:</label>
              <select id="compressionType" name="compressionType" required>
                <option value="gzip">gzip</option>
                <option value="deflate">deflate</option>
                <option value="br">br</option>
              </select>
            </div>

            <div>
              <label for="file">Select file:</label>
              <input type="file" id="file" name="file" required>
            </div>
            <div>
              <button type="submit">Compress</button>
            </div>
          </form>
        </body>
        </html>
      `);

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end('Incorrect method');

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const busboy = Busboy({ headers: req.headers });
      const fields = {};
      let fileBuffer = null;
      let fileName = null;

      busboy.on('field', (name, value) => {
        fields[name] = value;
      });

      busboy.on('file', (fieldname, file, info) => {
        const chunks = [];

        fileName = info.filename;

        file.on('data', (chunk) => chunks.push(chunk));

        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on('finish', () => {
        const { compressionType } = fields;

        if (
          !fileBuffer ||
          !compressionType ||
          !compressionTypes[compressionType]
        ) {
          res.statusCode = 400;
          res.end('Form Invalid');

          return;
        }

        const compressor = compressionTypes[compressionType]();
        const extensions = { gzip: '.gzip', deflate: '.deflate', br: '.br' };
        const compressedFileName = `${fileName}${extensions[compressionType]}`;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${compressedFileName}`,
        );

        const { Readable } = require('stream');

        Readable.from(fileBuffer).pipe(compressor).pipe(res);
      });

      req.pipe(busboy);

      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  });
}

module.exports = {
  createServer,
};
