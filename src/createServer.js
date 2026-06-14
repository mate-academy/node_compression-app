'use strict';

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const formidable = require('formidable');
const { pipeline } = require('stream');

const compressionTypes = {
  gzip: () => zlib.createGzip(),
  deflate: () => zlib.createDeflate(),
  br: () => zlib.createBrotliCompress(),
};

function createServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathName = url.pathname;

    if (pathName !== '/compress' && pathName !== '/') {
      res.statusCode = 404;
      res.end('Not found');

      return;
    }

    if (pathName === '/' && req.method.toLowerCase() === 'get') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      res.end(
        `<form method='POST' action='/compress' enctype='multipart/form-data'>
        <input type='file' name='file' />
        <select name='compressionType'>
          <option value='gzip' default>gzip</option>
          <option value='deflate'>deflate</option>
          <option value='br'>br</option>
        </select>
        <button type='submit'>Submit</button>
      </form>`,
      );

      return;
    }

    if (pathName === '/compress') {
      if (req.method.toLowerCase() !== 'post') {
        res.statusCode = 400;
        res.end('Only POST requests are allowed');

        return;
      }

      const form = new formidable.IncomingForm();

      form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !fields.compressionType) {
          res.statusCode = 400;
          res.end('Bad request');

          return;
        }

        const file = files.file[0];
        const compressionType = fields.compressionType[0];

        if (!compressionTypes[compressionType]) {
          res.statusCode = 400;
          res.end('Invalid compression type');

          return;
        }

        if (!file.filepath) {
          res.statusCode = 400;
          res.end('File path is undefined');

          return;
        }

        const fileName = `${file.originalFilename}.${compressionType}`;

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}`,
        );

        const compressed = compressionTypes[compressionType]();

        const fileStream = fs.createReadStream(file.filepath);

        pipeline(fileStream, compressed, res, (e) => {
          if (e) {
            res.statusCode = 500;
            res.end('Internal server error');
          }
        });

        res.on('close', () => {
          fileStream.destroy();
          compressed.destroy();
        });
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
