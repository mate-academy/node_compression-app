'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { formidable } = require('formidable');

const compressionTypes = {
  gzip: { createStream: zlib.createGzip, extension: 'gz' },
  deflate: { createStream: zlib.createDeflate, extension: 'dfl' },
  br: { createStream: zlib.createBrotliCompress, extension: 'br' },
};

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    if (req.method === 'GET' && req.url === '/favicon.ico') {
      res.writeHead(204);
      res.end();

      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html',
      });

      res.end(`
        <form method="POST" action="/compress" enctype="multipart/form-data">
          <input type="file" name="file" />

          <select name="compressionType">
            <option value="gzip">gzip</option>
            <option value="deflate">deflate</option>
            <option value="br">br</option>
          </select>

          <button type="submit">Submit</button>
        </form>
      `);

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400);
      res.end();

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const form = formidable({});

      let fields;
      let files;

      try {
        [fields, files] = await form.parse(req);
      } catch {
        res.writeHead(400);
        res.end();

        return;
      }

      const [file] = files.file || [];
      const [compressionType] = fields.compressionType || [];
      const compression = compressionTypes[compressionType];

      if (!file || !compression) {
        res.writeHead(400);
        res.end();

        return;
      }

      res.writeHead(200, {
        'Content-Disposition': `attachment; filename=${file.originalFilename}.${compression.extension}`,
      });

      try {
        await pipeline(
          fs.createReadStream(file.filepath),
          compression.createStream(),
          res,
        );
      } catch {
        res.destroy();
      }

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
