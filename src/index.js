/* eslint-disable no-shadow */
/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const multer = require('multer');

const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const filePath = path.resolve('public', 'index.html');

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File not found');

      return;
    }

    const page = fs.createReadStream(filePath).pipe(res);

    page.on('error', (err) => {
      console.log(err);
      res.statusCode = 500;
      res.end('Server error');
    });

    page.on('end', () => {
      res.end();
    });

    res.on('close', () => {
      page.destroy();
    });
  } else if (req.url === '/compress' && req.method.toLowerCase() === 'post') {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.log(err);
        res.statusCode = 500;
        res.end('Server error');

        return;
      }

      const { originalname, path: filePath } = req.file;

      const gzip = createGzip();

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/zip');

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${originalname}.gz"`
      );
      res.statusCode = 200;

      pipeline(fs.createReadStream(filePath), gzip, res, (error) => {
        if (error) {
          console.log(error);
          res.statusCode = 500;
          res.end('Server error');
        } else {
          fs.unlink(filePath, (error) => {
            if (error) {
              console.log(error);
            }
          });
        }
      });
    });
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
