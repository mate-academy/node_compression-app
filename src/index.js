/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { IncomingForm } = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathName = url.pathname.slice(1) || 'index.html';

  if (pathName === 'index.html') {
    res.setHeader('Content-type', 'text/html');

    const file = fs.createReadStream(path.join('public/', pathName));

    file.pipe(res);

    file.on('error', () => {
      res.statusCode = 404;
      res.end();
    });
  } else if (pathName === 'download') {
    const form = new IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = '400';
        res.end('Error parsing the files');
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
  console.log(`Server is running on http://localhost:${PORT}`);
});
