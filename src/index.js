'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;
  const compressionType = params.get('compression');
  const fileName = params.get('file') || 'index.html';
  const filePath = path.resolve('public', fileName);

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end(filePath);

    return;
  }

  const fileStream = fs.createReadStream(filePath);

  if (fileName === 'index.html') {
    res.setHeader('Content-Type', 'text/html');
    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    let gzip;

    if (compressionType === 'gzip') {
      gzip = zlib.createGzip();
    } else {
      gzip = zlib.createBrotliCompress();
    }

    fileStream.pipe(gzip).pipe(res);
  }

  fileStream.on('erroe', (err) => {
    res.statusCode = 500;
    res.end(err);
  });

  res.on('close', () => fileStream.destroy());
});

server.on('error', () => {});

server.listen(3005, () => {
  // eslint-disable-next-line
  console.log('Server is running');
});

module.exports = {
  server,
};
