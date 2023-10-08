/* eslint-disable no-console */
'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const pipeline = require('pipeline');

const PORT = process.env.PORT || '3005';

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/upload' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end(err);

        return;
      }

      const file = fs.createReadStream(files.file.filepath);

      let compression;
      let extension;

      if (fields.compression === 'br') {
        extension = '.br';
        res.setHeader('Content-Encoding', 'br');
        compression = zlib.createBrotliCompress();
      } else {
        extension = '.gz';
        compression = zlib.createGzip();
        res.setHeader('Content-Encoding', 'gzip');
      }

      const newFilePath = files.file.originalFilename + extension;
      const newFile = fs.createWriteStream(newFilePath);

      res.setHeader('Content-Type', 'application/octet-stream');

      pipeline(file, compression, newFile, (error) => {
        if (error) {
          res.end(error);
        }
      });
    });
  } else {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File does not exist');

      return;
    }

    const file = fs.createReadStream(filePath);

    file.pipe(res);

    file.on('error', () => {
      res.end('Error file not found');
    });

    res.on('close', () => {
      file.destroy();
    });
  }
});

server.on('error', () => { });

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
