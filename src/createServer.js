'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = http.createServer((req, res) => {
    if (req.url === '/compress' && req.method.toLowerCase() === 'post') {
      const form = new formidable.IncomingForm();
      const compressionTypes = ['gzip', 'deflate', 'br'];
      let zlibCompression;
      let compressionType;
      let compressionFileExtension;

      form.parse(req, (_err, fields, files) => {
        if (
          !fields['compressionType'] ||
          compressionTypes.indexOf(fields['compressionType'][0]) === -1
        ) {
          res.writeHead(400);

          res.end();

          return;
        }

        compressionType = fields['compressionType'][0];

        if (!files.file) {
          res.writeHead(400);

          res.end();

          return;
        }

        const oldPath = files.file[0].filepath;
        const originalFileName = files.file[0].originalFilename;
        const newPath = path.join(__dirname, originalFileName);

        fs.renameSync(oldPath, newPath);

        const source = fs.createReadStream(newPath);

        if (compressionType === 'gzip') {
          zlibCompression = zlib.createGzip();
          compressionFileExtension = 'gzip';
        } else if (compressionType === 'deflate') {
          zlibCompression = zlib.createDeflate();
          compressionFileExtension = 'deflate';
        } else if (compressionType === 'br') {
          zlibCompression = zlib.createBrotliCompress();
          compressionFileExtension = 'br';
        }

        // const destination = fs.createWriteStream(
        //   `${files.file[0].originalFilename}.${compressionFileExtension}`,
        // );

        res.writeHead(200, {
          'content-disposition': `attachment; filename=${originalFileName}.${compressionFileExtension}`,
        });

        const stream = source.pipe(zlibCompression).pipe(res);

        stream.on('finish', () => {
          // res.write(
          // eslint-disable-next-line max-len
          //  `Successful compressing file: ${originalFileName} using compression type: ${compressionType}`,
          // );
          res.end();

          fs.unlinkSync(newPath);
        });
      });

      return;
    }

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });

      res.write(
        // eslint-disable-next-line max-len
        '<form action="compress" method="post" enctype="multipart/form-data">',
      );

      res.write('<input type="file" name="file"><br>');

      res.write(
        '<label for="compressionType">Choose compression type:</label>',
      );
      res.write('<select name="compressionType" id="compressionType">');
      res.write('<option value="gzip">gzip</option>');
      res.write('<option value="deflate">deflate</option>');
      res.write('<option value="br">br</option>');
      res.write('</select><br>');
      res.write('<input type="submit">');
      res.write('</form>');

      return res.end();
    }

    if (req.url === '/compress' && req.method.toLowerCase() === 'get') {
      res.writeHead(400);

      res.end();

      return;
    }

    res.writeHead(404);

    res.end();
  });

  return server;
}

module.exports = {
  createServer,
};
