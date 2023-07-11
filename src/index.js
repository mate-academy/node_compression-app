/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/download' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('ERROR');

        return;
      }

      const file = fs.createReadStream(files.file.filepath);

      let compression = zlib.createGzip();
      let type = '.gzip';

      switch (fields.compression) {
        case 'br':
          type = '.br';
          compression = zlib.createBrotliCompress();
          break;

        case 'dfl':
          type = '.dfl';
          compression = zlib.createDeflate();
          break;

        default:
          type = '.gzip';
          compression = zlib.createGzip();
          break;
      }

      res.setHeader('Content-Encoding', type);

      const newFile = files.file.originalFilename + type;

      pipeline(file, compression, res, (error) => {
        if (error) {
          console.log(error);

          res.end('ERROR');
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader('Content-Disposition', `attachment; filename=${newFile}`);

      res.statusCode = 200;
      res.end();
    });
  } else {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File does not exist');

      return;
    }

    const file = fs.createReadStream(filePath);

    file.pipe(res);
    res.writeHead(200, { 'Content-Type': 'text/html' });

    file.on('error', (error) => {
      console.log(error);

      res.statusCode = 400;
      res.end('Something went wrong :(');
    });

    res.on('close', () => {
      file.destroy();
    });
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});
