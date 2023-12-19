/* eslint-disable no-useless-return */
'use strict';

const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;

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
      const oneFile = file[0];

      const { compression } = fields;

      if (!file || !compression) {
        res.statusCode = 400;

        res.end('Error! Select a file and type');

        return;
      }

      const fileStream = fs.createReadStream(oneFile.filepath);

      fileStream.on('error', () => { });

      fileStream.pipe(fs.createWriteStream(`
        download/${oneFile.originalFilename}
      `));

      let extension;
      let zlibType;

      switch (compression[0]) {
        case 'gzip':
          extension = '.gzip';
          zlibType = zlib.createGzip();
          break;
        case 'deflate':
          extension = '.dfl';
          zlibType = zlib.createDeflate();
          break;
        case 'br':
          extension = '.br';
          zlibType = zlib.createBrotliCompress();
          break;
        default:
          res.statusCode = 400;
          res.end('Compression type is not valid');

          return;
      }

      const pipelineStream = pipeline(fileStream, zlibType, res, (error) => {
        if (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(error));
        } else {
          const newName = oneFile.originalFilename.split('.')[0] + extension;

          res.setHeader('Content-Type', 'application/octet-stream');

          res.setHeader(
            `Content-Disposition`,
            `attachment; filename=${newName}`);
          res.statusCode = 200;
          res.end();
        }
      });

      res.on('close', () => {
        if (pipelineStream) {
          fileStream.destroy();
        }
      });
    });
  } else {
    res.on('error', () => 'Error');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    res.end(`
      <!DOCTYPE html>
      <html lang="en">

      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compression</title>
      </head>

      <body>
        <form action="/download" method="POST" enctype="multipart/form-data">
          <label for="file">
            Select file:
            <input id="file" type="file" name="file" />
          </label>
          <label for="type">
            Select type of compression:
            <select name="compression">
              <option value="gzip">Gzip</option>
              <option value="deflate">Deflate</option>
              <option value="br">Brotli</option>
            </select>
          </label>
          <button type="submit">
            Submit
          </button>
        </form>
      </body>

      </html>
    `);
  }
});

server.on('error', () => { });

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is working on http://localhost:${PORT}`);
});
