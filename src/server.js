'use strict';

const http = require('http');
const { pipeline } = require('stream');
const { readFile, existsSync, createReadStream } = require('fs');
const { formidable } = require('formidable');
const { createGzip, createBrotliCompress, createDeflate } = require('zlib');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const resName = pathname === '/' ? '/index.html' : pathname;

  if (pathname !== '/compress') {
    readFile(`./static${resName}`, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end();
      } else {
        res.end(data);
      }
    });

    return;
  }

  if (req.method.toLowerCase() !== 'post') {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Server accepts only POST requests');

    return;
  }

  parseFormData(req, res);
});

const parseFormData = (req, res) => {
  const form = formidable({});

  const onError = () => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error: Unable to compress');
  };

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end('Error while parsing form data');

      return;
    }

    if (!fields.compression) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Compression is not defined');

      return;
    }

    if (!files.file) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('No file to compress');

      return;
    }

    const filePath = files.file.filepath;

    if (!existsSync(filePath)) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal error: Can not access original file');

      return;
    }

    const fileToProcess = createReadStream(filePath);
    const resultFileName = files.file.originalFilename
      + `_${fields.compression}_compressed`;

    switch (fields.compression) {
      case 'gzip':
        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${resultFileName}.gz`,
        });
        pipeline(fileToProcess, createGzip(), res, onError);
        break;

      case 'deflate':
        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${resultFileName}.dfl`,
        });
        pipeline(fileToProcess, createDeflate(), res, onError);
        break;

      case 'br':
        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${resultFileName}.br`,
        });
        pipeline(fileToProcess, createBrotliCompress(), res, onError);
        break;

      default:
        onError();
    }
  });
};

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on http://localhost:${PORT}`);
});
