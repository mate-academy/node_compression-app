'use strict';

const http = require('node:http');
const { formidable } = require('formidable');
const fs = require('node:fs');
const zlib = require('node:zlib');

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    if (req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      res.end(`
        <form action="/compress" method="POST" enctype="multipart/form-data">
          <label for="file">Select a file:</label><br />
          <input type="file" name="file" id="file" style="cursor:pointer" /><br /><br />

          <label for="type">Choose compression:</label><br />
          <select name="compressionType" id="type" style="cursor:pointer">
            <option value="gzip">gzip</option>
            <option value="deflate">deflate</option>
            <option value="br">br</option>
          </select><br /><br />

          <button type="submit" style="cursor:pointer">Compress</button>
        </form>
      `);
    } else if (req.url === '/favicon.ico') {
      res.end('');
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = formidable({});

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;

          return res.end('Error while parsing the form');
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!compressionType || !file || !file.filepath) {
          res.statusCode = 400;

          return res.end('File or compression type missing');
        }

        let compressor;
        let extension;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            extension = 'gzip';
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            extension = 'deflate';
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            extension = 'br';
            break;
          default:
            res.statusCode = 400;

            return res.end('Unsupported compression type');
        }

        const inputPath = file.filepath;
        const originalName = file.originalFilename || 'file.txt';

        if (!fs.existsSync(inputPath)) {
          res.statusCode = 400;

          return res.end('Uploaded file not found');
        }

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${originalName}.${extension}`,
        );

        const readStream = fs.createReadStream(inputPath);

        readStream.pipe(compressor).pipe(res);

        res.on('close', () => {
          readStream.destroy();
          compressor.destroy();
        });
      });
    } else if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('GET not supported for /compress');
    } else {
      res.statusCode = 404;
      res.end('Not found');

      return null;
    }
  });

  server.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.log('Error', error);
  });

  return server;
}

module.exports = {
  createServer,
};
