'use strict';

const http = require('http');
const zlib = require('zlib');
const { pipeline } = require('stream');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html');

      res.end(`
        <html>
          <body>
            <h2>File Compressor</h2>
            <form id="compressorForm" method="POST" enctype="multipart/form-data">
              <input type="file" name="file" required/> <br><br>
              <select name="compressionType" required>
                <option value="gzip">gzip</option>
                <option value="deflate">deflate</option>
                <option value="br">br</option>
              </select><br><br>
              <button type="submit">Compress</button>
            </form>
            <script>
              const form = document.getElementById('compressorForm');
              form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = new FormData(form);
                const fileInput = data.get('file');
                const compressionType = data.get('compressionType');

                const response = await fetch('/compress', {
                  method: 'POST',
                  body: data
                });

                const blob = await response.blob();

                const a = document.createElement('a');
                const extension = compressionType === 'gzip' ? '.gz' :
                                  compressionType === 'deflate' ? '.dfl' : '.br';
                a.href = URL.createObjectURL(blob);
                a.download = fileInput.name + extension;
                a.click();
              });
            </script>
          </body>
        </html>
      `);
      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          return res.end('Error parsing form');
        }

        const file = files.file;
        const compressionType = fields.compressionType;

        if (!file || !compressionType) {
          res.statusCode = 400;
          return res.end('Missing file or compression type');
        }

        // Escolhe compressor
        let compressor;
        if (compressionType === 'gzip') compressor = zlib.createGzip();
        else if (compressionType === 'deflate') compressor = zlib.createDeflate();
        else if (compressionType === 'br') compressor = zlib.createBrotliCompress();
        else {
          res.statusCode = 400;
          return res.end('Invalid compression type');
        }

        // Prepara nome do arquivo com extensão correta
        const extension = compressionType === 'gzip' ? '.gz' :
                          compressionType === 'deflate' ? '.dfl' : '.br';
        const filename = path.basename(file.originalFilename) + extension;

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const readStream = fs.createReadStream(file.filepath);

        pipeline(readStream, compressor, res, err => {
          if (err) {
            console.error(err);
            res.statusCode = 500;
            res.end('Compression error');
          }
        });
      });
    }
  });
}

module.exports = { createServer };
