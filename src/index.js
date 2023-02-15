/* eslint-disable space-before-function-paren */
/* eslint-disable no-console */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';

const PORT = process.env.PORT || 8080;

const server = new http.Server();

server.on('request', (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  if (req.url === '/') {
    const filePath = path.resolve(`public`, 'index.html');

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
    const file = [];

    req.on('data', (chunk) => {
      file.push(chunk);
    });

    req.on('error', (err) => {
      console.log(err);
      res.statusCode = 500;
      res.end('Server error');
    });

    req.on('end', () => {
      const buffer = Buffer.concat(file);

      fs.readFile('uploads/file', 'utf-8', (err, data) => {
        if (err) {
          console.log(err);
          res.statusCode = 500;
          res.end('Server error');
        }

        const regex = /(filename=")(.*?)(")/g;

        const fileName = regex.exec(data)[2];

        fs.createWriteStream(`uploads/${fileName}`).write(buffer);

        const gzip = createGzip();

        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'application/zip');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${fileName}.gz"`
        );
        res.statusCode = 200;

        pipeline(
          fs.createReadStream(`uploads/${fileName}`),
          gzip,
          res,
          (error) => {
            if (error) {
              console.log(err);
              res.statusCode = 500;
              res.end('Server error');
            }
          }
        );
      });
    });
  }
});

server.on('error', (err) => {
  console.log(err);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
