/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/upload') {
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const filePath = path.resolve('public', searchParams.fileName);
    const file = fs.createReadStream(filePath);

    let compess;

    if (searchParams.compressionType === 'br') {
      compess = zlib.createBrotliCompress();
      res.setHeader('Content-Encoding', 'br');
    } else {
      compess = zlib.createGzip();
      res.setHeader('Content-Encoding', 'gzip');
    }

    file
      .on('error', () => {})
      .pipe(compess)
      .on('error', () => {})
      .pipe(res)
      .on('error', () => {});

    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });

  res.end(`
    <form action="/upload">
      <select name="fileName">
        <option value="test.txt">test.txt</option>
        <option value="test2.txt">test2.txt</option>
      </select>

      <select name="compressionType">
        <option value="br">Brotli</option>
        <option value="gz">Gzip</option>
      </select>
      <input type="submit" value="Upload">
    </form>
  `);
});

server.on('error', (error) => {
  console.log('Error ', error);
});

server.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
});
