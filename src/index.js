'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const selectForm = `
  <form action="/compress" enctype="multipart/form-data" method="POST">
    <input type="file" name="file">

    <select name="compression">
      <option value="gzip">Gzip</option>
      <option value="br">Brotli</option>
      <option value="dfl">Deflate</option>
    </select>

    <button type="submit">Compress</button>
  </form>
`;

const PORT = process.env.PORT || 3000;

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/compress' && req.method === 'POST') {
    const form = formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end(String(err));

        return;
      }

      const file = fs.createReadStream(files.file.filepath);

      let compresion = zlib.createGzip();
      let extension = '.gzip';

      switch (fields.compresion) {
        case 'br':
          compresion = zlib.createBrotliCompress();
          extension = '.br';
          break;

        case 'dfl':
          compresion = zlib.createDeflate();
          extension = '.dfl';
          break;

        default:
          compresion = zlib.createGzip();
          extension = '.gz';
          break;
      }

      const newPath = files.file.originalFilename + extension;
      const newFile = fs.createWriteStream(newPath);

      pipeline(file, compresion, newFile, (error) => {
        if (error) {
          res.end(String(error));
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=${}');
      res.statusCode = 200;
      res.end();
    });
  } else {
    res.setHeader(200, { 'Content-Type': 'text/html' });
    res.write(selectForm);
    res.end();
  }
});

server.on('error', () => {});

server.listen(PORT);
