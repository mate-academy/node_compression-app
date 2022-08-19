/* eslint-disable no-console,max-len */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');

const server = new http.Server();

server.on('request', (req, res) => {
  const writeStream = fs.createWriteStream('./src/lorem-new.txt');

  req.pipe(writeStream);

  const file = fs.createReadStream('./src/lorem-new.txt');

  const gzip = zlib.createGzip();

  file.pipe(gzip);

  res.setHeader('Content-type', 'file/gzip');

  res.setHeader('Content-Disposition',
    'attachment; filename=Lorem-new.gzip'
  );

  gzip.pipe(res);

  file.on('error', () => {
    res.statusCode = 500;
    res.end('File error');
  });

  res.on('error', () => {
    res.statusCode = 500;
    res.end('Response error');
  });
});

server.on('error', (err) => {
  console.log(err);
});

server.listen(3000, () => {
  const options = {
    port: 63342,
    host: 'localhost',
  };

  const request = http.request(options);

  request.setHeader('Content-Disposition', 'form-data; name="file"; filename="Lorem.txt"');
  request.setHeader('Content-Type', 'text/plain');
});
