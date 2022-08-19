/* eslint-disable no-console,max-len */
'use strict';

const http = require('http');
const fs = require('fs');

const server = new http.Server();

server.on('request', async(req, res) => {
  const writeStream = fs.createWriteStream('./src/lorem-new.txt');

  req.pipe(writeStream);

  const file = fs.createReadStream('./src/lorem-new.txt');

  res.setHeader('Content-type', 'text/txt');

  res.setHeader('Content-Disposition',
    'attachment; filename=Lorem-new.txt'
  );

  file.pipe(res);

  file.on('error', () => {
    res.statusCode = 500;
    res.end('File error');
  });

  res.on('error', () => {
    res.statusCode = 500;
    res.end('Response error');
  });
});

server.on('error', () => {});

server.listen(3000, () => {
  const options = {
    port: 63342,
    host: 'localhost',
  };

  const request = http.request(options);

  request.setHeader('Content-Disposition', 'form-data; name="file"; filename="Lorem.txt"');
  request.setHeader('Content-Type', 'text/plain');
});
