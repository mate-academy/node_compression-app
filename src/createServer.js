'use strict';

const fs = require('node:fs');
const { Server } = require('node:http');
const path = require('node:path');
const { pipeline, Readable } = require('node:stream');
const zlib = require('node:zlib');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = new Server();

  server.on('request', async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathName = url.pathname;

    if (!pathName.includes('/compress')) {
      const fileName = pathName === '/' ? 'index.html' : pathName.slice(1);
      const filePath = path.join(__dirname, fileName);

      if (fs.existsSync(filePath)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    } else {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      const responseMock = new Response(req, { headers: req.headers });
      const formData = await responseMock.formData();
      const file = formData.get('file');
      const compressionType = formData.get('compressionType');
      const allowedTypes = ['gzip', 'deflate', 'br'];

      if (!file || typeof file === 'string' || !file.name) {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      if (!allowedTypes.includes(compressionType)) {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      let extension = '';
      let compressor;

      switch (compressionType) {
        case 'gzip':
          extension = '.gz';
          compressor = zlib.createGzip();
          break;

        case 'deflate':
          extension = '.dfl';
          compressor = zlib.createDeflate();
          break;

        case 'br':
          extension = '.br';
          compressor = zlib.createBrotliCompress();
          break;
      }

      const compressedFileName = `${file.name}${extension}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileStream = Readable.from(buffer);

      res.statusCode = 200;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${compressedFileName}`,
      );
      res.setHeader('Content-Type', 'application/octet-stream');

      pipeline(fileStream, compressor, res, () => {});
    }
  });

  return server;
}

module.exports = {
  createServer,
};
