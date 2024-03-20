/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { formidable } = require('formidable');

const { getContentType } = require('../helpers/getContentType');

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    const url = new URL(req.url, `http:${req.headers.host}`);
    const filename = url.pathname.slice(1) || 'index.html';
    const pathToFile = path.resolve('public', filename);

    if (req.method.toLowerCase() === 'post' && req.url === '/compress') {
      const form = formidable({});
      let files;
      // let fields;

      try {
        [, files] = await form.parse(req);
      } catch (err) {
        console.error(err);
        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }

      if (!files || !files.multipleFiles || !files.multipleFiles.length) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No files uploaded');

        return;
      }

      const file = files.multipleFiles[0];
      const readstream = fs.createReadStream(file.filepath);

      res.setHeader('Content-Type', getContentType(file.originalFilename));

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${file.originalFilename}`,
      );

      readstream.on('error', (err) => {
        console.error('File not found:', err);
      });

      readstream.pipe(res);

      fs.unlink(file.filepath, (err) => {
        if (err) {
          console.error(err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
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
