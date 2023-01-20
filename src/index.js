/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;
const server = new http.Server();

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

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename[0]}-copy.${filename[1]}`,
      );

      if (compressType === 'gzip') {
        const gzip = zlib.createGzip();

        pipeline(fileStream, gzip, res, (error) => {
          if (error) {
            res.statusCode = 500;
            res.end('Something went wrong');
          }
        });
      };

      if (compressType === 'br') {
        const br = zlib.createBrotliCompress();

        pipeline(fileStream, br, res, (error) => {
          if (error) {
            res.statusCode = 500;
            res.end('Something went wrong');
          }
        });
      };

      res.on('close', () => {
        fileStream.destroy();
      });
    });
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    res.end(
      `<form
        action="/upload"
        method="post"
        enctype="multipart/form-data"
        target="_blank"
      >
        <input name="filetoupload" type="file" required>
        <select name="compressing">
          <option value="gzip">Gzip</option>
          <option value="br">Brotli</option>
        </select>
        <button type="submit">Submit</button>
      </form>`
    );
  }
});

server.on('error', (error) => {
  console.log('Error occurred:', error);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
