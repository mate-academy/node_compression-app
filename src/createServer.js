'use strict';

const { formidable } = require('formidable');
const { createReadStream } = require('fs');
const http = require('http');
const zlib = require('node:zlib');
const { pipeline } = require('stream');

function createServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const htmlForm =
        // eslint-disable-next-line max-len
        '<form action="/compress" method="POST" enctype="multipart/form-data"><input type="file" name="file"><select name="compressionType"><option value="gzip">gzip</option><option value="deflate">deflate</option><option value="br">br</option></select><button type="submit">Compress</button></form>';

      res.writeHead(200, {
        'Content-Type': 'text/html',
      });
      res.end(htmlForm);

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const form = formidable();
      let fields;
      let files;

      try {
        [fields, files] = await form.parse(req);
      } catch (err) {
        res.writeHead(err.httpCode || 400, { 'Content-Type': '' });
        res.end(String(err));

        return;
      }

      const compressionType = fields.compressionType?.[0];
      const uploadedFile = files.file?.[0];
      let ext;

      if (!compressionType || !uploadedFile) {
        res.statusCode = 400;
        res.end();

        return;
      }

      let compressor;

      switch (compressionType) {
        case 'gzip':
          ext = '.gz';
          compressor = zlib.createGzip();
          break;

        case 'deflate':
          ext = '.dfl';
          compressor = zlib.createDeflate();
          break;

        case 'br':
          ext = '.br';
          compressor = zlib.createBrotliCompress();
          break;

        default:
          res.statusCode = 400;
          res.end();

          return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${uploadedFile.originalFilename}${ext}`,
      });

      pipeline(
        createReadStream(uploadedFile.filepath),
        compressor,
        res,
        (err) => {
          if (err) {
            res.destroy(err);
          }
        },
      );

      return;
    }

    res.statusCode = 404;
    res.end();
  });

  return server;
}

module.exports = {
  createServer,
};
