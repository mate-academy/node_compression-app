'use strict';

const http = require('http');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream');
const formidable = require('formidable');
const { createGzip, createBrotliCompress, createDeflate } = require('zlib');
const { compressFilesForm } = require('./compressFilesForm');
const { handleErrors } = require('./handleErrors');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/compress' && req.method === 'POST') {
    const form = formidable({ multiples: true });

    form.parse(req, (err, fields, files) => {
      if (err) {
        handleErrors(res, err);

        return;
      }

      const { filepath, originalFilename } = files.file;
      const compressionType = fields.compressionType;

      if (!originalFilename) {
        handleErrors(res);

        return;
      }

      const readable = createReadStream(filepath);
      let extensions;
      let transform;

      switch (compressionType) {
        case 'gzip':
          transform = createGzip();
          extensions = 'gz';
          break;

        case 'deflate':
          transform = createDeflate();
          extensions = 'dfl';
          break;

        default:
          transform = createBrotliCompress();
          extensions = 'br';
          break;
      }

      const writable = createWriteStream(`${originalFilename}.${extensions}`);

      pipeline(readable, transform, writable, (error) => {
        if (error) {
          handleErrors(res, error);
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader('Content-Disposition',
        `attachment; filename=${originalFilename}.${extensions}`);
      res.statusCode = 200;
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(compressFilesForm);
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started on http://localhost:${PORT}`);
});
