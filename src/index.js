'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');

const PORT = process.env.PORT || 3000;

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 404;
        res.end(err);
      }

      const { compression } = fields;

      const filePath = files.filetoupload.filepath;

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('File does not exist');
      }

      const file = fs.createReadStream(filePath);

      if (compression.toLocaleLowerCase() === 'gzip') {
        const gzip = zlib.createGzip();

        pipeline(file, gzip, res, (error) => {
          if (err) {
            res.statusCode = 404;
            res.end(error);
          }
        });
      }

      if (compression.toLocaleLowerCase() === 'brotli') {
        const br = zlib.createBrotliCompress();

        pipeline(file, br, res, (error) => {
          if (error) {
            res.statusCode = 404;
            res.end(error);
          }
        });
      }

      res.on('close', () => {
        file.destroy();
      });
    });
  }

  res.setHeader('Content-Type', 'text/html');

  res.end(`
  <form action="/upload", method="post", enctype='multipart/form-data'>
    <input type='file' name='filetoupload'><br>
    <label for="compression-select">Choose a compression type:</label>

    <select name="compression" id="compression-select">
      <option value="">--Please choose an option--</option>
      <option value="gzip">Gzip</option>
      <option value="brotli">Brotli</option>
    </select>

    <input type='submit' name='upload_btn' value='upload'>
  </form>
  `);
});

server.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.log(error);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`The server is running on port ${PORT}`);
});
