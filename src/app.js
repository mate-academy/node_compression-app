/* eslint-disable no-unused-vars */
/* eslint-disable curly */
/* eslint-disable no-shadow */
/* eslint-disable max-len */
/* eslint-disable no-useless-return */
/* eslint-disable padding-line-between-statements */
/* eslint-disable no-console */
'use strict';

const PORT = process.env.PORT || 5001;

const http = require('http');
const zlib = require('zlib');
const formidable = require('formidable');
const fs = require('fs');
const { pipeline } = require('stream');
// const path = require('path');

const server = new http.Server();

server.on('request', (req, res) => {
  // const myURL = new URL(req.url, `http://localhost:${PORT}`);
  // console.log(normalizedURL);

  if (req.method === 'POST' && req.url === '/upload') {
    const form = new formidable.IncomingForm();
    // console.log(form);

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end(JSON.stringify(err));

        return;
      }

      const { file } = files;
      const normalizedFile = file[0];

      const { compression } = fields;

      if (!file || !compression) {
        res.statusCode = 400;
        res.end('Please select a file and compression type');

        return;
      }

      const readStream = fs.createReadStream(normalizedFile.filepath);

      readStream.on('error', () => {});

      readStream.pipe(fs.createWriteStream(`uploads/${normalizedFile.originalFilename}`));

      let extension;
      let compressionStream;

      switch (compression[0]) {
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
        default:
          res.statusCode = 400;
          res.end('Please select a valid compression type');

          return;
      }

      const newFileName = normalizedFile.originalFilename.split('.')[0] + extension;
      console.log(newFileName);

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
        `attachment; filename=${newFileName}`
      );

      res.on('close', () => readStream.destroy());

      res.statusCode = 200;
      res.end();
    });
  } else {
    res.on('error', () => 'res  error');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    res.end(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
      </head>
      <body>
        <form action="/upload" method="post" enctype="multipart/form-data">
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
          <button type="submit">
            Submit
          </button>
        </form>
      </body>
    </html>
  `);
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
