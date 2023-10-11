/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const zlib = require('zlib');

const PORT = process.env.PORT || 8050;

const server = http.createServer(async(req, res) => {
  const normalizeUrl = new URL(req.url, `http://${req.headers.host}`);
  const filePath = normalizeUrl.pathname.slice(1) || 'index.html';

  if (filePath === 'index.html' || filePath === 'style.css') {
    const data = fs.createReadStream(
      path.join(__dirname, `../public/${filePath}`)
    );

    data.pipe(res);

    data.on('error', (err) => {
      console.log(err);

      res.statusCode = 500;
      res.end('Server error');
    });

    data.on('close', () => data.destroy());

    return;
  }

  if (filePath === 'uplode' && req.method.toUpperCase() === 'POST') {
    const form = new formidable.IncomingForm();
    const uploadFolder = path.join(__dirname, '../tepm');

    form.uploadDir = uploadFolder;

    await form.parse(req, (err, fields, files) => {
      if (err) {
        console.log(err);
      }

      let compression;
      let extension = '';

      switch (fields.compression[0]) {
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

      const newFileName = files.file[0].originalFilename + extension;

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader('Content-Disposition',
        `attachment; filename=${newFileName}`);

      const file = fs
        .createReadStream(path.join(uploadFolder, files.file[0].newFilename));

      file
        .on('error', (error) => {
          console.log('Error read\n', error);
        })
        .pipe(compression)
        .on('error', (error) => {
          console.log('Error compression\n', error);
        })
        .pipe(res)
        .on('error', (error) => {
          console.log('Error response\n', error);
        });

      res.statusCode = 200;
      res.end();

      fs.rm(path.join(uploadFolder, files.file[0].newFilename), (error) => {
        console.log(error);
      });
    });
  }
});

server.on('error', (err) => {
  console.log(err);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
