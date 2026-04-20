/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
const formidable = require('formidable');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      res.end(`
        <div style="display: flex; flex-direction: column; align-items: center;">
          <h1>Form</h1>

          <form
            action="/compress"
            method="POST"
            enctype="multipart/form-data"
            style="display: flex; flex-direction: column; gap: 20px;"
          >
            <label for="file">Select a file:</label>
            <input id="file" type="file" name="file" />

            <label for="compressionType">Select compression type:</label>
            <select id="compressionType" name="compressionType">
              <option value="" selected>---</option>
              <option value="gzip">gzip</option>
              <option value="deflate">deflate</option>
              <option value="br">br</option>
            </select>

            <button type="submit">Upload</button>
          </form>
        </div>
      `);

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');

      res.end(
        'All requests to /compress endpoint should be with the POST method',
      );

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Something went wrong');

          return;
        }

        const file = files.file ? files.file[0] : null;
        const compressionType = fields.compressionType
          ? fields.compressionType[0]
          : null;

        if (!file || !compressionType) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          res.end('No such file or compression type');

          return;
        }

        const availableCompressionTypes = ['gzip', 'deflate', 'br'];

        if (!availableCompressionTypes.includes(compressionType)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          res.end('No compression type');

          return;
        }

        let compressStream = null;

        switch (compressionType) {
          case 'gzip':
            compressStream = zlib.createGzip();

            break;

          case 'deflate':
            compressStream = zlib.createDeflate();

            break;

          case 'br':
            compressStream = zlib.createBrotliCompress();

            break;

          default: {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Something went wrong');

            return;
          }
        }

        const compressedFileName = `${file.originalFilename}.${compressionType}`;
        const filePath = file.filepath;
        const fileReadStream = fs.createReadStream(filePath);

        pipeline(fileReadStream, compressStream, res, (e) => {
          if (e) {
            console.log(e);

            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Something went wrong');
          }
        });

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${compressedFileName}`,
        );

        res.on('close', () => {
          fileReadStream.destroy();
        });
      });

      return;
    }

    res.statusCode = 404;
    res.end('Page not found');
  });

  server.on('error', (err) => console.log(err));

  return server;
}

module.exports = {
  createServer,
};
