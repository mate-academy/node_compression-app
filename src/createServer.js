'use strict';

const fs = require('node:fs');
const http = require('node:http');
const zlib = require('node:zlib');

const multiparty = require('multiparty');

const htmlForm = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>File Compression</title>
  </head>
  <body>
    <h1>File Compression</h1>
    <form action="./compress" method="POST" enctype="multipart/form-data">
      <label for="file">Select a file: </label>
      <input id="file" name="file" type="file" required><br>
      <label for="compressionType">Select a compression: </label>
      <select id="compressionType" name="compressionType" style="margin-block: 10px;">
        <option value="gzip">gzip</option>
        <option value="deflate">deflate</option>
        <option value="br">br</option>
      </select><br>
      <input type="submit" value="Submit">
    </form>
  </body>
</html>
`;

function createServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-type': 'text/html' });
      res.end(htmlForm);

      return;
    }

    if (req.url.startsWith('/compress')) {
      if (req.method !== 'POST') {
        res.writeHead(400, 'Bad Request', { 'Content-type': 'text/plain' });

        return res.end('GET method not allowed on /compress');
      }

      const form = new multiparty.Form();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Error in file parsing');
        }

        if (!files.file || files.file.length === 0) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('No file uploaded');
        }

        if (!fields.compressionType || fields.compressionType.length === 0) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('No compression type selected');
        }

        const file = files.file[0];
        const compressionType = fields.compressionType[0];

        const fileStream = fs.createReadStream(file.path);

        res.on('close', () => {
          fileStream.destroy();
          fs.unlink(file.path, () => {});
        });

        if (compressionType === 'gzip') {
          res.writeHead(200, {
            'Content-Type': 'application/gzip',
            'Content-disposition': `attachment; filename=${file.originalFilename}.gzip`,
          });

          return fileStream.pipe(zlib.createGzip()).pipe(res);
        }

        if (compressionType === 'deflate') {
          res.writeHead(200, {
            'Content-Type': 'application/deflate',
            'Content-disposition': `attachment; filename=${file.originalFilename}.deflate`,
          });

          return fileStream.pipe(zlib.createDeflate()).pipe(res);
        }

        if (compressionType === 'br') {
          res.writeHead(200, {
            'Content-Type': 'application/br',
            'Content-disposition': `attachment; filename=${file.originalFilename}.br`,
          });

          return fileStream.pipe(zlib.createBrotliCompress()).pipe(res);
        }

        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Unsupported compression type');
      });

      return;
    }

    res.writeHead(404, 'Not Found', { 'Content-type': 'text/plain' });
    res.end('Not Found');
  });

  return server;
}

module.exports = {
  createServer,
};
