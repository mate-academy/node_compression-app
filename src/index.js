'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/fileupload') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('unable to upload, pls check your file');
      }

      const compressType = fields.select;

      res.setHeader('Content-Encoding', compressType);

      const filePath = files.filetoupload.filepath;

      const file = fs.createReadStream(filePath);

      if (compressType === 'gzip') {
        const gzip = zlib.createGzip();

        file.pipe(gzip).pipe(res);
      };

      if (compressType === 'br') {
        const brotly = zlib.createBrotliCompress();

        file.pipe(brotly).pipe(res);
      };

      file.on('error', () => {
        res.statusCode = 500;
        res.end('SERVER ERROR');
      });

      res.on('close', () => {
        file.destroy();
      });
    });

    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });

  res.write(
    '<form action="fileupload" method="post" enctype="multipart/form-data">'
  );
  res.write('<input type="file" name="filetoupload"><br>');
  res.write('<select name="select">');
  res.write('<option value="gzip">Gzip</option>');
  res.write('<option value="br">Brotli</option>');
  res.write('</select>');
  res.write('<input type="submit">');
  res.write('</form>');

  return res.end();
}).on('error', () => {
  'server not responding, try again later';
}).listen(8080);
