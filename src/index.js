'use strict';

const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const formidable = require('formidable');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/upload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }

      let zip;

      const { filepath, originalFilename } = files.filename;
      const readStream = fs.createReadStream(filepath);

      switch (fields.type) {
        case 'gzip':
          zip = zlib.createGzip();
          res.setHeader('Content-type', 'application/x-gzip');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${originalFilename}.gz`
          );
          break;
        case 'brotli':
          zip = zlib.createBrotliCompress();
          res.setHeader('Content-type', 'application/x-br');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${originalFilename}.br`
          );
          break;
      }

      readStream.pipe(zip);
      zip.pipe(res);
    });

    return;
  }

  res.setHeader('Content-type', 'text/html');

  res.end(`
    <form
      action="http://localhost:3000/upload"
      method="post"
      enctype="multipart/form-data"
    >
      <input type='file' id="myFile" name="filename">
      <select name="type">
        <option>gzip</option>
        <option>brotli</option>
      </select>
      <button type="submit">Upload</button>
    <form>
  `);
});

server.listen(3000);
