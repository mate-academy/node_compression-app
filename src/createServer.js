'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const formidable = require('formidable');
const { compressFile } = require('./compressFile');

const createServer = () => {
  const PORT = process.env.PORT || 5700;
  const server = new http.Server();

  server.on('request', (req, res) => {
    const normalizedURL = new url.URL(req.url, `http://localhost:${PORT}`);
    const fileName = normalizedURL.pathname.slice(1) || 'index.html';
    const requestMethod = req.method.toLowerCase();

    if (req.url === '/' && requestMethod === 'get') {
      fs.readFile(`./public/${fileName}`, (err, data) => {
        if (!err) {
          res.setHeader('Content-type', 'text/html');
          res.statusCode = 200;
          res.end(data);
        }

        res.statusCode = 400;
        res.end();
      });
    } else if (req.url === '/compress' && requestMethod === 'post') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end();

          return;
        }

        if (!files.hasOwnProperty('file')
          || !fields.hasOwnProperty('compressionType')
        ) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid form data');

          return;
        }

        const uploadFilePath = files.file.filepath;
        const fileStream = fs.createReadStream(uploadFilePath);
        const originalFileName = files.file.originalFilename;
        const { compressionType } = fields;

        if (!['br', 'deflate', 'gzip'].includes(compressionType)) {
          res.end('Invalid compression type.');
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return;
        }

        const { compressedData, extension } = compressFile(compressionType);

        fileStream.pipe(compressedData);

        res.writeHead(200, { 'Content-Disposition':
          `attachment; filename=${originalFileName}.${extension}` });
        compressedData.pipe(res);

        res.on('close', () => fileStream.destroy());
      });
    } else if (req.url === '/compress'
      && requestMethod === 'get'
    ) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end();
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end();
    }
  });

  server.on('error', () => {});

  return server;
};

module.exports = {
  createServer,
};
