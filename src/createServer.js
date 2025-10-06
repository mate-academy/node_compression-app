'use strict';

const http = require('http');
const path = require('path');
const zlib = require('node:zlib');
const { Readable } = require('stream');

const extMap = { gzip: 'gzip', deflate: 'deflate', br: 'br' };

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.end('OK');

      return;
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end('Incorrect form method');

      return;
    }

    const ct = req.headers['content-type'];

    if (!ct || !ct.includes('multipart/form-data')) {
      res.statusCode = 400;
      res.end('Expected multipart/form-data');

      return;
    }

    const boundary = ct.split('boundary=')[1]?.replace(/(^"|"$)/g, '');

    if (!boundary) {
      res.statusCode = 400;
      res.end('Missing boundary');

      return;
    }

    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);

    const boundaryBuf = Buffer.from(`--${boundary}`);
    let start = 0;
    const parts = [];

    while (true) {
      const idx = body.indexOf(boundaryBuf, start);

      if (idx === -1) {
        break;
      }

      const nextIdx = body.indexOf(boundaryBuf, idx + boundaryBuf.length);
      const end = nextIdx !== -1 ? nextIdx : body.length;

      parts.push(body.slice(idx + boundaryBuf.length, end));
      start = end;
    }

    let fileBuffer = null;
    let filename = null;
    let type = null;

    for (const part of parts) {
      let p = part;

      if (p.slice(0, 2).toString() === '\r\n') {
        p = p.slice(2);
      }

      const delimiter = Buffer.from('\r\n\r\n');
      const idx = p.indexOf(delimiter);

      if (idx === -1) {
        continue;
      }

      const headersBuf = p.slice(0, idx);
      const bodyBuf = p.slice(idx + delimiter.length);
      const headersStr = headersBuf.toString('utf8').trim();

      if (headersStr.includes('name="compressionType"')) {
        type = bodyBuf.toString('utf8').trim().toLowerCase();

        if (!['gzip', 'deflate', 'br'].includes(type)) {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }
      }

      if (headersStr.includes('name="file"')) {
        const match = headersStr.match(/filename="(.+?)"/);

        filename = match ? match[1] : 'file';

        let endIdx = bodyBuf.length;

        if (bodyBuf.slice(-2).toString() === '\r\n') {
          endIdx -= 2;
        }
        fileBuffer = bodyBuf.slice(0, endIdx);
      }
    }

    if (!fileBuffer || !type) {
      res.statusCode = 400;
      res.end('Missing file or compressionType');

      return;
    }

    const compressor =
      type === 'gzip'
        ? zlib.createGzip()
        : type === 'deflate'
          ? zlib.createDeflate()
          : zlib.createBrotliCompress();

    const compressedFileName = `${path.basename(filename)}.${extMap[type]}`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${compressedFileName}`,
    );

    const stream = Readable.from([fileBuffer]);

    stream
      .pipe(compressor)
      .pipe(res)
      .on('error', () => {
        res.statusCode = 500;
        res.end('Compression error');
      });
  });
}

module.exports = { createServer };
