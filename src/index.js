/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const { pipeline } = require('stream');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const FORM = `
<form action="/compress" enctype="multipart/form-data" method="POST">
<input type="file" name="file"><br>
<select name="compression">
  <option value="gzip">Gzip</option>
  <option value="br">Brotli</option>
  <option value="dfl">Deflate</option>
</select>
<button type="submit">Compress</button>
</form>
`;

const server = new http.Server();

server.on('request', async(req, res) => {
  if (req.url === '/compress' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.log(err);
        res.statusCode = 400;
        res.end(String(err));

        return;
      }

      const file = fs.createReadStream(files.file[0].filepath);
      let compressor;
      let format;

      switch (fields.compression[0]) {
        case 'br': {
          compressor = zlib.createBrotliCompress();
          format = '.br';
          break;
        }

        case 'dfl': {
          compressor = zlib.createDeflate();
          format = '.dfl';
          break;
        }

        default: {
          compressor = zlib.createGzip();
          format = '.gz';
          break;
        }
      }

      const newFileName = files.file[0].originalFilename.split('.')[0] + format;

      res.setHeader('Content-Encoding', fields.compression[0]);
      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${newFileName}`,
      );

      pipeline(file, compressor, res, (error) => {
        if (error) {
          console.log(error);

          res.end(JSON.stringify(error));
        }
      });
    });
  } else {
    res.setHeader('Content-Type', 'text/html');

    res.end(FORM);
  }
});

server.on('error', (err) => {
  console.log(err);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
