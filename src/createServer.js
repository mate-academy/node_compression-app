'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { parseForm } = require('./parseForm');
const { sendCompressedFile } = require('./sendFile');

module.exports = {
  createServer,
};

/* eslint no-console: "warn" */
/* eslint max-len: "warn" */
/* eslint space-before-function-paren: "warn" */
function createServer () {
  const server = new http.Server();

  server.on('request', async function (req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const endPoint = url.pathname;

    switch (endPoint) {
      case '/': {
        res.setHeader('Content-Encoding', 'gzip');
        res.statusCode = 200;

        sendCompressedFile(
          res,
          path.resolve('public', 'index.html'),
          'gzip',
        );

        return;
      }

      case '/compress': {
        if (req.method.toUpperCase() === 'GET') {
          res.statusCode = 400;
          res.end('Trying send a GET request to "/compress"');

          return;
        }

        if (req.method.toUpperCase() === 'POST') {
          const {
            fileName,
            filePath,
            compressionType,
          } = await parseForm(req);

          if (!fileName
            || !filePath
            || !compressionType) {
            res.statusCode = 400;
            res.statusMessage = 'Invalid form data';
            res.end('Invalid form data');

            return;
          }

          res.setHeader(
            'Content-Disposition',
            'attachment; '
            + `filename=${fileName}.${compressionType}`,
          );

          sendCompressedFile(
            res,
            filePath,
            compressionType,
          );

          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error(error);
          }
        }

        return;
      }

      default: {
        res.statusCode = 404;
        res.end('Trying access a non-existent endpoint');
      }
    }
  });

  return server;
};
