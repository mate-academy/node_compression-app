'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const getZlibInstance = (compressionType) => {
  try {
    switch (compressionType) {
      case 'gzip':
        return zlib.createGzip();
      case 'gunzip':
        return zlib.createGunzip();
      case 'deflate':
        return zlib.createDeflate();
      default:
        return zlib.createGzip();
    };
  } catch (error) {
    return error;
  }
};

const handleIndex = (req, res) => {
  res.setHeader('Content-type', 'text/html');

  const fileStream = fs.createReadStream('./public/index.html');

  fileStream.pipe(res);

  fileStream.on('end', () => {
    // eslint-disable-next-line no-console
    console.log('Completed');
  });

  fileStream.on('error', () => {
    res.statusCode = 500;
    res.end('Server error');
  });
};

const handleUpload = (req, res) => {
  res.setHeader('Content-Disposition', 'attachment');

  const form = formidable({
    multiples: true, uploadDir: './temp',
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(err));

      return;
    }

    const zip = getZlibInstance(fields.compressionType);

    const file = files.file;

    const fileStream = fs.createReadStream(file.filepath);

    pipeline(fileStream, zip, res, (error) => {
      // eslint-disable-next-line no-console
      console.log(error);
      res.statusCode = 500;
      res.end('Server error');
    });

    res.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.log(error);
      res.statusCode = 500;
      res.end('Server error');
    });
  });
};

const server = http.createServer((req, res) => {
  if (req.url === '/upload' && req.method === 'POST') {
    handleUpload(req, res);
  } else {
    handleIndex(req, res);
  }
});

server.on('error', () => {});

server.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Server started! 🚀');
});
