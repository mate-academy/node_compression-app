'use strict';

const http = require('http');
const zlib = require('zlib');
const { validate } = require('./validate');
const { endpoints, index, compMethods } = require('./constants');
const Busboy = require('busboy');

function handleCompress(req, res, comp) {
  const bb = Busboy({ headers: req.headers });

  const compressors = {
    [compMethods.gzip]: zlib.createGzip,
    [compMethods.deflate]: zlib.createDeflate,
    [compMethods.brotli]: zlib.createBrotliCompress,
  };

  const compressor = compressors[comp]?.();

  if (!compressor) {
    res.statusCode = 400;

    return res.end('Unsupported compression method');
  }

  let fileHandled = false;

  const err = () => {
    res.statusCode = 500;
    res.end('Server Error');
  };

  bb.on('file', (name, file, { filename }) => {
    fileHandled = true;

    const ext = {
      [compMethods.gzip]: 'gz',
      [compMethods.deflate]: 'dfl',
      [compMethods.brotli]: 'br',
    };

    const finName = `${filename}.${ext[comp]}`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader('Content-Disposition', `attachment; filename="${finName}"`);

    file
      .on('error', err)
      .pipe(compressor)
      .on('error', err)
      .pipe(res)
      .on('error', err);
  });

  bb.on('finish', () => {
    if (!fileHandled) {
      res.statusCode = 400;
      res.end('No file provided');
    }
  });

  bb.on('close', () => bb.destroy());

  req.pipe(bb);
}

const createProcessor = (req, res, params = null) => ({
  [endpoints.home]: () => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(index);
  },
  [endpoints.compress]: () => handleCompress(req, res, params),
});

function createServer() {
  return http.createServer((req, res) => {
    const val = validate(req);

    if (!val.ok) {
      res.statusCode = val.statusCode;
      res.end(val.message);

      return;
    }

    createProcessor(req, res, val.compression)[val.pathname]();
  });
}

module.exports = {
  createServer,
};
