'use strict';
/* eslint-disable no-console */

const http = require('http');
const fs = require('fs');
const { IncomingForm } = require('formidable');
const { pipeline } = require('stream');
const { getCompressionOptions } = require('./getCompressionOptions');

const compressionTypeAvailable = ['gzip', 'br', 'deflate'];

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');

      fs.createReadStream('public/index.html').pipe(res);

      return;
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;
      res.statusMessage = 'URL not found';
      res.end();

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.statusMessage = 'Method GET is not allowed';
      res.end();

      return;
    }

    const form = new IncomingForm();
    let compressionTypeArr;
    let fileArr;

    try {
      [{ compressionType: compressionTypeArr }, { file: fileArr }] =
        await form.parse(req);
    } catch (err) {
      res.statusCode = 500;
      res.statusMessage = 'Formidable error';
      res.end();

      return;
    }

    const file = fileArr === undefined ? undefined : fileArr[0];
    const compressionType =
      compressionTypeArr === undefined ? undefined : compressionTypeArr[0];

    if (!file || !compressionType) {
      res.statusCode = 400;
      res.statusMessage = 'Form is not valid';
      res.end();

      return;
    }

    if (!compressionTypeAvailable.includes(compressionType)) {
      res.statusCode = 400;
      res.statusMessage = 'Compression type is not valid';
      res.end();

      return;
    }

    const { originalFilename: fileName, filepath: filePath } = file;

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}.${compressionType}`,
    );

    const fileStream = fs.createReadStream(filePath);
    const { stream: compressedStream, extension } =
      getCompressionOptions(compressionType);

    compressedStream.pipe(fs.createWriteStream(`${filePath}.${extension}`));

    pipeline(fileStream, compressedStream, res, (err) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

    res.on('close', () => {
      fileStream.destroy();
    });
  });

  return server;
}

module.exports = {
  createServer,
};
