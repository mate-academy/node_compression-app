'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/fileupload') {
    const form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
      if (err) {
        res.statusCode = 400;
        res.end('Error parsing the files');
      }

      const originalFilename = files.file.originalFilename.split('.');
      const fileStream = fs.createReadStream(files.file.filepath);

      res.setHeader('Content-Disposition', `attachment;
        filename=copy-${originalFilename[0]}.${originalFilename[1]}`);

      if (fields.select === 'Gzip') {
        const gzip = zlib.createGzip();

        fileStream.pipe(gzip).pipe(res);
      } else {
        const brotly = zlib.createBrotliCompress();

        fileStream.pipe(brotly).pipe(res);
      }

      fileStream.on('error', () => {
        res.statusCode = 500;
        res.end('Server error');
      });
    });
  } else {
    res.setHeader('Content-Type', 'text/html');

    res.write(
      `<form
        action="fileupload"
        method="post"
        enctype="multipart/form-data"
      >
        <input name="file" type="file">
        <select name="select">
          <option value="Gzip">Gzip</option>
          <option value="Brotli">Brotli</option>
        </select>
        <button type="submit">Submit</button>
      </form>`);

    return res.end();
  }
});

server.on('error', () => {});

server.listen(3000);
