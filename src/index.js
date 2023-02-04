/* eslint-disable max-len */
'use strict';

const http = require('http');
const { uploadForm } = require('./uploadForm');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/fileupload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('Error parsing a file');
      }

      const originalFileNameArr = files.fileupload.originalFilename.split('.');
      const extension = originalFileNameArr[1];
      const fileName = originalFileNameArr[0];
      const fileStream = fs.createReadStream('./' + fileName + extension);

      res.setHeader('Content-Disposition', `attachment; fileName=${fileName}.${extension}`);

      if (fields.select === 'Gzip') {
        const gzip = zlib.createGzip();

        fileStream.pipe(gzip).pipe(res);
      }

      if (fields.select === 'Brotli') {
        const brotli = zlib.createBrotliCompress();

        fileStream.pipe(brotli).pipe(res);
      }

      fileStream.on('error', () => {
        res.statusCode = 400;
        res.end('Server error');
      });

      res.on('error', () => {});
      res.end();
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    res.write(uploadForm);
    res.end();
  }
});

server.on('error', () => {
  throw Error;
});

server.listen(3000);
