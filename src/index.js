'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');

const { formForSelection } = require('./formForSelection.js');

const server = new http.Server();

const PORT = process.env.PORT || 3000;

server.on('request', (req, res) => {
  if (req.url === '/compress' && req.method === 'POST') {
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
      const newFile = fs
        .createWriteStream(newFilePath);

      pipeline(file, compression, newFile, (error) => {
        if (error) {
          res.end(String(err));
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader('Content-Disposition',
        `attachment; filename=${newFilePath}`);

      res.statusCode = 200;
      res.end();
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(formForSelection);
    res.end();
  }
});

server.on('error', () => {});
server.listen(PORT);
