'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/upload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('Unknown error occured');

        return;
      }

      if (!files.filename) {
        res.statusCode = 204;
        res.end('No content');

        return;
      }

      let compressed;

      const { filepath, originalFilename } = files.filename;

      switch (fields.type) {
        case 'gzip':
          compressed = zlib.createGzip();

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${originalFilename}.gz`
          );
          break;

        case 'br':
          compressed = zlib.createBrotliCompress();

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${originalFilename}.br`
          );
          break;

        case 'deflate':
          compressed = zlib.createDeflate();

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${originalFilename}.zz`
          );
          break;
      }

      const readStream = fs.createReadStream(filepath);

      readStream.pipe(compressed);
      compressed.pipe(res);
    });

    return;
  }

  res.setHeader('Content-type', 'text/html');

  res.end(`
    <form
      action="http://localhost:${PORT}/upload"
      method="post"
      enctype="multipart/form-data"
    >
      <input type='file' name="filename">

      <select name="type">
        <option value="gzip">Gzip</option>
        <option value="br">Brotli</option>
        <option value="deflate">Deflate</option>
      </select>

      <button type="submit">Submit</button>
    <form>
  `);
});

server.listen(PORT);
