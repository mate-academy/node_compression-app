import http from 'http';
import fs from 'fs';
import zlib from 'zlib';
import { pipeline } from 'stream';
import formidable from 'formidable';

const PORT = process.env.PORT || 3000;
const server = http.createServer();

server.on('request', (req, res) => {
  if (req.url === '/upload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('Error parsing the files');
      }

      const compressType = fields.compressing;
      const filePath = files.filetoupload.filepath;
      const filename = files.filetoupload.originalFilename.split('.');
      const fileStream = fs.createReadStream(filePath);

      switch (compressType) {
        case 'gzip':
          const gzip = zlib.createGzip();

          filename.push('gz');

          res.setHeader(
            'Content-Disposition',
            // eslint-disable-next-line max-len
            `attachment; filename=${filename[0]}.${filename[1]}.${filename[2]}`,
          );

          pipeline(fileStream, gzip, res, (error) => {
            if (error) {
              res.statusCode = 500;
              res.end('Something went wrong');
            }
          });

          break;
        case 'br':
          const br = zlib.createBrotliCompress();

          filename.push('br');

          res.setHeader(
            'Content-Disposition',
            // eslint-disable-next-line max-len
            `attachment; filename=${filename[0]}.${filename[1]}.${filename[2]}`,
          );

          pipeline(fileStream, br, res, (error) => {
            if (error) {
              res.statusCode = 500;
              res.end('Something went wrong');
            }
          });

          break;
        case 'def':
          const def = zlib.createDeflate();

          filename.push('deflate');

          res.setHeader(
            'Content-Disposition',
            // eslint-disable-next-line max-len
            `attachment; filename=${filename[0]}.${filename[1]}.${filename[2]}`,
          );

          pipeline(fileStream, def, res, (error) => {
            if (error) {
              res.statusCode = 500;
              res.end('Something went wrong');
            }
          });

          break;
      }

      res.on('close', () => {
        fileStream.destroy();
      });
    });
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    const pageHtml = fs.createReadStream('public/index.html');

    pageHtml.pipe(res);
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`listen on http://localhost:${PORT}`);
});
