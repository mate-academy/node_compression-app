/* eslint-disable no-console */
'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');
const http = require('node:http');
const parser = require('form-parser');
const { pipeline } = require('node:stream');

const compressionMap = {
  gzip: {
    function: zlib.createGzip(),
    extension: '.gz',
    appendHeaders: (res) => {
      res.setHeader('Content-Encoding', 'gzip');
    },
  },
  deflate: {
    function: zlib.createDeflate(),
    extension: '.dfl',
    appendHeaders: (res) => {
      res.setHeader('Content-Encoding', 'deflate');
    },
  },
  br: {
    function: zlib.createBrotliCompress(),
    extension: '.br',
    appendHeaders: (res) => {
      res.setHeader('Content-Encoding', 'br');
    },
  },
};

function createServer() {
  const server = new http.Server();

  server.on('request', async(req, res) => {
    if (req.url === '/') {
      fs.readFile('../public/index.html', (err, data) => {
        if (!err) {
          res.statusCode = 200;

          return res.end(data);
        } else {
          // res.statusCode = 500;
          res.statusCode = 200;

          return res.end();
        }
      });
    } else if (req.url === '/compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;

        return res.end();
      }

      try {
        const formData = {};

        await parser(req, async field => {
          const { fieldType, fieldName, fieldContent } = field;

          console.log(field);

          if (fieldType === 'file') {
            formData.fileToCompress = fieldContent;
          } else {
            formData[fieldName] = fieldContent;
          }
        });

        if (
          !formData.compressionType
          || !compressionMap[formData.compressionType]
        ) {
          res.statusCode = 400;

          return res.end();
        }

        const compressFunction
          = compressionMap[formData.compressionType].function;

        const compression = compressionMap[formData.compressionType];
        const fileName = formData.fileToCompress.fileName;
        const fileReadStream = formData.fileToCompress.fileStream;

        res.setHeader('Content-Disposition',
          `attachment; filename=${fileName}${compression.extension}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        compression.appendHeaders(res);

        pipeline(fileReadStream, compressFunction, res, (error) => {
          if (error) {
            console.error(error);
            res.statusCode = 500;

            return res.end();
          }
        });
      } catch (err) {
        res.statusCode = 400;
        console.log(err);

        return res.end();
      }
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  return server;
}

module.exports = {
  createServer,
};
