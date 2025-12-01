'use strict';

const http = require('http');
const fs = require('fs/promises');
const fsCb = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const busboy = require('busboy');

const form = `<form action="http://localhost:5700/compress" method="POST" enctype="multipart/form-data" style="display: flex; flex-direction: column; max-width: 300px; row-gap: 12px">
                <select name="compressionType">
                  <option value="gzip">gzip</option>
                  <option value="deflate">deflate</option>
                  <option value="br">br</option>
                </select>
                <input type="file" name="file" />
                <input type="submit"/>
              </form>`;

function createServer() {
  const acceptableCompression = {
    gzip: { create: zlib.createGzip },
    deflate: { create: zlib.createDeflate },
    br: { create: zlib.createBrotliCompress },
  };

  const acceptableEndpoint = {
    index: {
      path: 'index',
      method: 'GET',
    },
    compress: {
      path: 'compress',
      method: 'POST',
    },
  };

  const server = new http.Server();

  server.on('request', async (req, res) => {
    const normalizeUrl = new URL(req.url, `http://${req.headers.host}`);
    const requestedPath = normalizeUrl.pathname.slice(1) || 'index';
    const requestedMethod = req.method;

    if (!Object.keys(acceptableEndpoint).includes(requestedPath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');

      return res.end('Non-existent endpoint');
    }

    if (
      requestedPath === acceptableEndpoint.index.path &&
      requestedMethod === acceptableEndpoint.index.method
    ) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      return res.end(form);
    }

    if (
      requestedPath === acceptableEndpoint.compress.path &&
      requestedMethod === acceptableEndpoint.compress.method
    ) {
      const field = {};
      const file = {};
      const writeStreamPromises = [];
      const tmpDir = await fs.mkdtemp(path.resolve(__dirname, '..', 'upload-'));
      const bb = busboy({ headers: req.headers });

      res.on('close', () => {
        fs.rm(tmpDir, { recursive: true });
      });

      bb.on('field', (name, value) => (field[name] = value));

      bb.on('file', (name, fileStream, info) => {
        const { filename, mimeType } = info;
        const filePath = path.join(tmpDir, `${filename}`);

        if (!filePath.startsWith(tmpDir)) {
          res.writeHead(400, { 'content-type': 'text/plain' });

          return res.end('Invalid filename');
        }

        file.fileName = filename;
        file.mimeType = mimeType;
        file.filePath = filePath;

        const streamPromis = new Promise((resolve, reject) => {
          const wrs = fsCb
            .createWriteStream(filePath)
            .on('finish', () => resolve())
            .on('error', (er) => reject(er));

          fileStream.on('error', (er) => reject(er));
          fileStream.pipe(wrs);
        });

        writeStreamPromises.push(streamPromis);
      });

      bb.on('close', async () => {
        if (!field.compressionType || !file.fileName) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          res.end('form is invalid');
        } else {
          await Promise.all(writeStreamPromises);

          const type = field.compressionType;

          if (!acceptableCompression[type]) {
            res.writeHead(400, { 'content-type': 'text/plain' });

            return res.end('You entered the wrong format');
          }

          const readingFileStream = fsCb.createReadStream(file.filePath);
          const compressionStream = acceptableCompression[type].create();
          const resFileName = `${file.fileName}.${type}`;

          res.writeHead(200, {
            'content-type': `application/${field.compressionType}`,
            'content-disposition': `attachment; filename=${resFileName}`,
          });

          pipeline(readingFileStream, compressionStream, res, (err) => {
            // eslint-disable-next-line no-console, curly
            if (err) console.log(err);
          });
        }
      });

      req.pipe(bb);

      return;
    }

    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not supported method');
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
