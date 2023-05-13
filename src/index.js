/* eslint-disable no-console */
'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');

const PORT = process.env.PORT || '8080';

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/upload' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end(String(err));

        return;
      }

      const file = fs.createReadStream(files.file.filepath);

      let compression = zlib.createGzip();
      let extension = '.gzip';

      switch (fields.compression) {
        case 'br':
          compression = zlib.createBrotliCompress();
          extension = '.br';
          break;

        case 'dfl':
          compression = zlib.createDeflate();
          extension = '.dfl';
          break;

        default:
          compression = zlib.createGzip();
          extension = '.gz';
          break;
      }

      const newFilePath = files.file.originalFilename + extension;
      const newFile = fs.createWriteStream(newFilePath);

      pipeline(file, compression, newFile, (error) => {
        if (error) {
          console.log(error);

          res.end(String(err));
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${newFilePath}`
      );

      res.statusCode = 200;
      res.end();
    });
  } else {
    const htmlFile = fs.createReadStream('./public/index.html');

    htmlFile.pipe(res);

    res.writeHead(200, { 'Content-Type': 'text/html' });

    htmlFile.on('error', error => {
      console.log(error);

      res.statusCode = 400;
      res.end('Wooops! Something went wrong :(');
    });
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
