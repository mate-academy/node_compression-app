/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { getContentType } = require('../helpers/getContentType');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http:${req.headers.host}`);
    const filename = url.pathname.slice(1) || 'index.html';
    const pathToFile = path.resolve('public', filename);

    if (req.url === '/compress') {
      const chunks = [];

      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const file = Buffer.concat(chunks);
        const contentType = getContentType(file.toString());
        const name = file.toString().split('=').pop();

        res.writeHead(200, { 'Content-Type': contentType });

        const filePath = path.join('public', name, 'test.txt');

        const writeStream = fs.createWriteStream(filePath);

        writeStream.write(file);
        writeStream.end();
      });

      return;
    }

    if (!fs.existsSync(pathToFile)) {
      res.statusCode = 404;
      res.end('Not found');

      return;
    }

    const fileStream = fs.createReadStream(pathToFile);

    fileStream.on('error', () => {
      res.statusCode = 500;
      console.log('Stream error');
      res.end('');
    });

    fileStream.pipe(res);
    fileStream.on('close', () => fileStream.destroy());
  });

  server.on('error', () => {
    console.log('Server error: Server instance');
  });

  return server;
}

module.exports = {
  createServer,
};
