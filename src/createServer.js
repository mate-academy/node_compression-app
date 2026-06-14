const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const formidable = require('formidable');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const form = new formidable.IncomingForm();
    const filePath = path.resolve('src/public', 'index.html');

    if (pathname === '/' && req.method === 'GET') {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end('Server error');

          return null;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(data);
      });

      return;
    }

    if (pathname !== '/compress') {
      res.statusCode = 404;
      res.end('File does not exist');

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end('Choose POST method');

      return;
    }

    form.parse(req, (error, { compressionType: fields }, { file: files }) => {
      if (error || !fields || !files) {
        res.statusCode = 400;
        res.end('Error parsing form data');

        return;
      }

      const compressionTypes = ['gzip', 'deflate', 'br'];
      const [compressionType] = fields;
      const [file] = files;

      if (!compressionType || !file) {
        res.statusCode = 400;
        res.end('Missing compression type or file');

        return;
      }

      if (!compressionTypes.includes(compressionType)) {
        res.statusCode = 400;
        res.end('Change compression type');

        return;
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${encodeURIComponent(file.originalFilename)}.${compressionType}`,
      );

      const fileStream = fs.createReadStream(file.filepath);

      let compressed;

      switch (compressionType) {
        case 'gzip':
          compressed = zlib.createGzip();
          break;

        case 'deflate':
          compressed = zlib.createDeflate();
          break;

        case 'br':
          compressed = zlib.createBrotliCompress();
          break;

        default:
          break;
      }

      fileStream
        .on('error', () => {
          res.statusCode = 500;
          res.end('Server error');
        })
        .pipe(compressed)
        .on('error', () => {})
        .pipe(res)
        .on('error', () => {});

      res.on('close', () => fileStream.destroy());
    });
  });

  return server;
}

module.exports = {
  createServer,
};
