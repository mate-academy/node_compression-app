/* eslint-disable no-console */
'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const formidable = require('formidable');
const path = require('path');
const { getCompressionType } = require('./modules/compressionType');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;
const server = new http.Server();

server.on('request', (req, res) => {
  const normalizedURL = new url.URL(req.url, `http://${req.headers.host}`);
  const pathName = normalizedURL.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', pathName);

  if (pathName === 'index.html') {
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('Page not found');

      return;
    }

    const homePageStream = fs.createReadStream(filePath);

    homePageStream.pipe(res);

    homePageStream.on('error', (err) => {
      console.log(err);

      res.statusCode = 500;
      res.end('Server error');
    });

    res.on('close', () => homePageStream.destroy());
  }

  if (pathName === 'compression'
    && req.method.toUpperCase() === 'POST') {
    const form = new formidable.IncomingForm();

    form.on('error', (err) => {
      console.error('Error parsing form data:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    });

    form.parse(req, (err, fields, { file }) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal server error');
      }

      const fileToCompressPath = file[0].filepath;
      const compressionType = fields.format[0];
      const newFileName = encodeURIComponent(
        `${file[0].newFilename}` + `${compressionType}`);

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader(
        'Content-Disposition', `attachment; filename=${newFileName}`
      );

      const fileStream = fs.createReadStream(fileToCompressPath);
      const compressionStream = getCompressionType(compressionType);

      pipeline(fileStream, compressionStream(), res, (error) => {
        console.log(error);

        res.statusCode = 500;
        res.end('Internal server error');
      });
    });
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
