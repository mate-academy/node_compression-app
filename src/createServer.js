'use strict';

const http = require('node:http');
const { readfileStream } = require('./files');
const formidable = require('formidable');
const fs = require('node:fs');
const { sendTextResponse } = require('./sendResponse');
const { COMPRESS_TYPES, getCompressedFile } = require('./getCompressedFile');

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    const normalizedUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const path = normalizedUrl.pathname;

    if (req.method === 'GET' && path === '/') {
      readfileStream(res, 'index.html', 200, 'Ok');

      return;
    }

    if (req.method === 'GET' && path === '/compress') {
      return sendTextResponse(res, 400, 'Bad request');
    }

    if (req.method === 'POST' && path === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          return sendTextResponse(res, 400, 'Bad request');
        }

        const compressionType = fields.compressionType;
        const uploadedFile = files.file;

        if (!COMPRESS_TYPES[compressionType]) {
          return sendTextResponse(res, 400, 'Wrong compress type');
        }

        if (!uploadedFile) {
          return sendTextResponse(res, 400, 'No File');
        }

        const fileName = uploadedFile[0].originalFilename;
        const filePath = uploadedFile[0].filepath;
        const fileStream = fs.createReadStream(filePath);

        const compressedStream = getCompressedFile(compressionType[0]);

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}.${compressionType[0]}`,
        );

        fileStream.pipe(compressedStream).pipe(res);
      });

      return;
    }

    readfileStream(res, 'notFound.html', 404);
  });

  return server;
}

module.exports = {
  createServer,
};
