'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const PORT = process.env.PORT || '3000';

const server = http.Server();

server.on('request', (req, res) => {
  if (req.url === '/download' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end(JSON.stringify(err));

        return;
      }

      const { file } = files;
      const { compression } = fields;

      if (!file || !compression) {
        res.statusCode = 400;
        res.end('Please select a file and compression type');

        return;
      }

      const readStream = fs.createReadStream(file.filepath + '');

      let compressionStream;
      let extension;

      switch (compression) {
        case 'gzip':
          extension = '.gzip';
          compressionStream = zlib.createGzip();
          break;
        case 'deflate':
          extension = '.dfl';
          compressionStream = zlib.createDeflate();
          break;
        case 'br':
          extension = '.br';
          compressionStream = zlib.createBrotliCompress();
          break;
      }

      res.setHeader('Content-Encoding', extension);

      const fileName = file.originalFilename + extension;

      pipeline(readStream, compressionStream, res, (error) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.log(error);

          res.end(JSON.stringify(err));
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${fileName}`
      );

      res.statusCode = 200;
      res.end();
    });
  } else if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });

    res.end(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
        </head>
        <body>
          <form action="/download" method="POST" enctype="multipart/form-data">
            <label for="file">
              Select file:
              <input id="file" type="file" name="file"/>
            </label>
            <label for="type">
              Select type of compression:
              <select name="compression">
                <option value="gzip">Gzip</option>
                <option value="deflate">Deflate</option>
                <option value="br">Brotli</option>
              </select>
            </label>
            <button type="submit">Submit</button>
          </form>
        </body>
      </html>
    `);
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is listening on port ${PORT}`);
});
