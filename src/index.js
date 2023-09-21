/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const dotenv = require('dotenv');
const { pipeline, Transform } = require('stream');

dotenv.config();

const PORT = process.env.PORT;

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const normalized = new URL(req.url, `http://${req.headers.host}`);
    const fileName = normalized.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);
    const compressionType = normalized.searchParams.get('compressionType');

    if (!fs.existsSync(filePath)) {
      res.setHeader('Content-type', 'text/plain');
      res.statusCode = 404;
      res.end('File not found');

      return;
    }

    const compress = compressionType === 'brotli'
      ? zlib.createBrotliCompress()
      : zlib.createGzip();

    const typeOfCompress = compressionType === 'brotli'
      ? 'br'
      : 'gzip';

    const readStream = fs.createReadStream(filePath);
    const prependInfoStream = new Transform({
      transform(chunk, _, callback) {
        const info = `Compressed by: ${compressionType}\n\n`;

        this.push(info);
        this.push(chunk);
        callback();
      },
    });

    res.setHeader('Content-Encoding', typeOfCompress);
    res.setHeader('Content-type', 'text/plain');

    pipeline(readStream, prependInfoStream, compress, res, (error) => {
      if (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.end('Something went wrong');
      }
    });

    res.on('close', () => {
      readStream.destroy();
      compress.destroy();
    });

    return;
  }

  res.setHeader('Content-Type', 'text/html');

  res.end(`
    <h1>Hello</h1>
    <form method="POST">
      <label>
        Choose a type of compression
        <select name="compressionType">
          <option value="brotli">Brotli</option>
          <option value="gzip">Gzip</option>
        </select>
      </label>

      <button type="submit">
        Submit
      </button>
    </form>

    <script>
      const select = document.querySelector('select');
      const newURL = window.location.pathname + '?' +
        'compressionType=' + select.value.toString();
      history.pushState(null, null, newURL);

      select.addEventListener('change', (e) => {
        const searchParams = new URLSearchParams();
        searchParams.set('compressionType', e.target.value);
        const newURL = window.location.pathname + '?' + searchParams.toString()
        history.pushState(null, null, newURL);
      })
    </script>
  `);
});

server.on('error', (error) => {
  console.error(error);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
