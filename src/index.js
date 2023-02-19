'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.slice(1) || 'index.html';

  if (pathname === 'index.html') {
    res.setHeader('Content-Type', 'text/html');

    const file = fs.createReadStream('src/index.html');

    file.pipe(res);

    file.on('error', () => {
      res.statusCode = '404';
      res.end();
    });
  } else if (pathname === 'download') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = '400';
        res.end();
      }

      const filePath = files.file.filepath;
      const fileName = files.file.originalFilename;
      const compressionType = fields.compression;
      const contentType = files.file.mimetype;

      const readStream = fs.createReadStream(filePath);

      res.setHeader('Content-Type', `${contentType}`);
      res.setHeader('Content-Encoding', `${compressionType}`);
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      let compressingStream;

      switch (compressionType) {
        case 'Gzip':
          compressingStream = zlib.createGzip();
          break;

        case 'Brotli':
          compressingStream = zlib.createBrotliCompress();
          break;

        default:
          break;
      }

      pipeline(readStream, compressingStream, res, (error) => {
        if (error) {
          res.statusCode = 500;
          res.end('Unable to read file');
        }
      });

      res.on('close', () => {
        readStream.destroy();
      });
    });
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Server is running on http://localhost:${PORT}`);
});
