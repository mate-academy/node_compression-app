'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;

const server = new http.Server();

function onServerError(res) {
  res.statusCode = 500;
  res.end('Something went wrong');
}

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', fileName);

  if (fileName === 'api') {
    const form = formidable({
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        onServerError(res);
      }

      res.setHeader('Content-Encoding', 'gzip');

      res.setHeader(
        'Content-Disposition',
        'attachment;'
        + `filename=compressed-${files.file.originalFilename}`,
      );

      const { type } = fields;
      const readStream = fs.createReadStream(files.file.filepath);

      if (type === 'gzip') {
        const gzip = zlib.createGzip();

        pipeline(
          readStream,
          gzip,
          res,
          () => onServerError(res),
        );
      } else if (type === 'brotli') {
        const brotli = zlib.createBrotliCompress();

        pipeline(
          readStream,
          brotli,
          res,
          () => onServerError(res),
        );
      }
    });
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
