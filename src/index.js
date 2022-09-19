'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;

const server = new http.Server();

server.on('request', async(req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', fileName);

  if (fileName === 'api') {
    const gzip = zlib.createGzip();

    pipeline(
      req,
      gzip,
      res,
      (error) => {
        if (error) {
          res.statusCode = 500;
          console.log(error);
          res.end('Something went wrong');
        }
      },
    );
  } else {
    if (fileName !== 'compress' && !fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File does not exist');

      return;
    }

    res.setHeader('Content-Encoding', 'gzip');

    const file = fs.createReadStream(filePath);
    const gzip = zlib.createGzip();

    pipeline(
      file,
      gzip,
      res,
      (error) => {
        if (error) {
          res.statusCode = 404;
          console.log(error);
          res.end('Something went wrong');
        }
      },
    );

    file.on('error', () => {
      res.statusCode = 500;
      res.end('Something went wrong');
    });

    res.on('close', () => {
      file.destroy();
    });
  }
});

server.on('error', () => null);

server.listen(PORT, () => {
  console.log(`Server is launched on http://localhost:${PORT}`);
});
