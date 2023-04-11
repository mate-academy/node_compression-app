/* eslint-disable no-console,max-len */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 8080;

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/compress') {
    const form = formidable({ multiples: false });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end('Bad request');

        return;
      }

      const filePath = files.file.filepath;
      // const fileName = files.file.originalFilename.split('.');

      const streamFile = fs.createReadStream(filePath);

      const { compressionType } = fields;

      if (compressionType === 'gzip') {
        const compressStream = zlib.createGzip();

        pipeline(streamFile, compressStream, res, (error) => {
          if (error) {
            res.statusCode = 500;
            res.end('Error occurred!', error);
          }
        });

        return;
      }

      if (compressionType === 'brotli') {
        const compressStream = zlib.createBrotliCompress();

        pipeline(streamFile, compressStream, res, (error) => {
          if (error) {
            res.statusCode = 500;
            res.end('Error occurred!', error);
          }
        });

        return;
      }

      res.on('close', () => {
        streamFile.destroy();
      });
    });
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    res.end(`
    <h1>Compression App</h1>
    <form action="/compress" method="post" enctype="multipart/form-data">
      <label for="file">File:</label>
      <input type="file" name="file" id="file">
      <br><br>
      <label for="compressionType">Compression type:</label>
      <select name="compressionType" id="compressionType" required>
        <option value="" disabled selected>Choose type</option>
        <option value="gzip">GZIP</option>
        <option value="brotli">Brotli</option>
      </select>
      <br><br>
      <button type="submit">Compress</button>
    </form>
  `);
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});
