/* eslint-disable no-console */
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
      res.statusCode = 404;
      res.end();
    });
  } else if (pathname === 'dowload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end();
      }

      const filePath = files.file.filepath;
      const fileName = files.file.originalFilename;
      const compressing = fields.select;

      const fileStream = fs.createReadStream(filePath);

      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      fileStream.on('error', () => {
        res.statusCode = 500;
        res.end();
      });

      let compressingStream;

      switch (compressing) {
        case 'gzip':
          compressingStream = zlib.createGzip();
          break;

        case 'brotli':
          compressingStream = zlib.createBrotliCompress();
          break;

        default:
          break;
      }

      pipeline(fileStream, compressingStream, res, (error) => {
        if (error) {
          res.statusCode = 500;
          res.end('Something went wrong');
        }
      });

      res.on('close', () => {
        fileStream.destroy();
      });
    });
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
