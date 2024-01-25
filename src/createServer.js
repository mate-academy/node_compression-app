'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const { pipeline } = require('stream');
const { getCompressingParams } = require('./modules/getCompressingParams');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/') {
      const fileName = url.pathname.slice(1) || 'index.html';
      const formPagePath = path.resolve('public', fileName);
      const formStream = fs.createReadStream(formPagePath);

      res.writeHead(200, { 'Content-type': 'text/html' });
      formStream.pipe(res);
    } else if (url.pathname === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (!fields.compression || !files.file) {
          res.statusCode = 400;
          res.end('Please provide a compresion type and import file');

          return;
        }

        if (err) {
          res.statusCode = 400;
          res.end(`Error found: ${err}`);

          return;
        }

        const compressionType = fields.compression[0];
        const file = files.file[0];

        const {
          extention,
          compressionStream,
        } = getCompressingParams(compressionType, res);

        const newFileName = file.originalFilename + extention;

        const readFileStream = fs.createReadStream(file.filepath);

        pipeline(readFileStream, compressionStream, res, (error) => {
          res.statusCode = 500;
          res.end(JSON.stringify(error));
        });

        res.statusCode = 200;

        res.setHeader(
          'content-disposition',
          `attachment; filename=${newFileName}`
        );
        res.end();

        res.on('close', () => readFileStream.destroy());
      });
    } else if (url.pathname === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Can not open this page. Before go to home page');
    } else {
      res.statusCode = 404;
      res.end('The provided url is non-existent.');
    }
  });

  server.on('error', (error) => {
    /* eslint-disable-next-line */
    console.log(error);
  });

  return server;
}

module.exports = {
  createServer,
};
