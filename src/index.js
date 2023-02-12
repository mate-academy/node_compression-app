'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;
const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathName = url.pathname.slice(1) || 'index.html';

  if (pathName === 'index.html') {
    res.setHeader('Content-Type', 'text/html');

    const file = fs.createReadStream(`./public/${pathName}`);

    file.on('error', () => {
      res.statusCode = 404;
      res.end();
    });

    file.pipe(res);

    res.on('close', () => {
      file.destroy();
    });

    return;
  }

  if (pathName === 'upload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end();
      }

      const selectedCompression = fields.compression;
      const pathToFile = files.file.filepath;
      const fileName = files.file.originalFilename;
      const contentType = files.file.mimetype;

      const stream = fs.createReadStream(pathToFile);

      res.setHeader('Content-Type', `${contentType}`);
      res.setHeader('Content-Encoding', `${selectedCompression}`);
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      let compressionStream;

      switch (selectedCompression) {
        case 'gzip':
          compressionStream = zlib.createGzip();
          break;

        case 'br':
          compressionStream = zlib.createBrotliCompress();
          break;

        default:
          break;
      }

      pipeline(stream, compressionStream, res, (error) => {
        if (error) {
          res.statusCode = 500;
          res.end('Unable to read file');
        }
      });

      res.on('close', () => {
        stream.destroy();
      });
    });

    return;
  }

  res.statusCode = 404;
  res.end('File does not exist');
});

server.on('error', () => {});
server.listen(PORT);
