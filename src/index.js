'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/favicon.ico') {
    return;
  }

  if (req.url === '/download' && req.method.toLowerCase() === 'post') {
    const form = new formidable.IncomingForm({
      encoding: 'utf-8',
      allowEmptyFiles: false,
      uploadDir: path.join(__dirname, 'download'),
      filename: (name, ext, part) => {
        return part.originalFilename;
      },
    });

    form.parse(req, async(err, fields, files) => {
      if (err) {
        res.statusCode = 404;
        res.end('Unable to download file');
      }

      const fileName = files.file.originalFilename;
      const { compression } = fields;
      const pathForDownload = path.join(__dirname, 'download', fileName);

      const file = fs.createReadStream(pathForDownload);
      let compressedFile;
      let extention;

      if (compression === 'brotli') {
        extention = '.br';
        res.setHeader('Content-Type', 'br');
        compressedFile = zlib.createBrotliCompress();
      } else {
        extention = '.gzp';
        compressedFile = zlib.createGzip();
        res.setHeader('Content-Type', 'gzip');
      }

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader(
        'Content-Disposition', `attachment; fileName=${fileName + extention}`
      );

      pipeline(file, compressedFile, res, (error) => {
        if (error) {
          res.end(JSON.stringify(error));
        }
      });
    });
  } else {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('src', fileName);

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
}
);

server.on('error', () => {});
server.listen(3000);
