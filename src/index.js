'use strict';
// ES's imports doesnt work.
// import fs from 'fs';
// import http from 'http';
// import busboy from 'busboy';
// import zlib from 'zlib';

const fs = require('fs');
const http = require('http');
const busboy = require('busboy');
const zlib = require('zlib');

const PORT = 8000;

const server = new http.Server();

server.on('request', (request, response) => {
  // Get Styles:
  if (request.url === '/src/public/main.css' && request.method === 'GET') {
    const styles = fs.createReadStream('src/public/main.css');

    response.setHeader('Content-Type', 'text/css');
    styles.pipe(response);

    return;
  }

  // Get index.html:
  if (request.url === '/' && request.method === 'GET') {
    const file = fs.createReadStream('src/public/index.html');

    response.setHeader('Content-Type', 'text/html');
    file.pipe(response);

  // Get data and file from form, compress it end save on server:
  // -*Nor sure I realized the task correct, 'cuz that"s looks a bit complicated
  // -**But interesting!))
  } else if (request.url === '/upload' && request.method === 'POST') {
    let filename;
    let compressType;
    let compressMethod = 'Gzip';
    const parseForm = busboy({ headers: request.headers });
    const randomPartOfName = String(Math.random()).slice(2, 7);
    const uploadTo = 'src/uploadedFiles/';

    // get compression type from the form select:
    parseForm.on('field', (name, val) => {
      if (name === 'compression') {
        compressMethod = val;
      }
    });

    // get the file from the form:
    parseForm.on('file', (name, file, info) => {
      switch (compressMethod) {
        case 'BrotliCompress':
          compressType = zlib.createBrotliCompress();
          break;
        case 'Deflate':
          compressType = zlib.createDeflate();
          break;
        default:
          compressType = zlib.createGzip();
          break;
      }

      filename = info.filename;

      // stream with compression and write handlers:
      file
        .pipe(compressType)
        .pipe(fs.createWriteStream(
          uploadTo + randomPartOfName + filename
        ));
    });

    // return a result info on stream close:
    parseForm.on('close', () => {
      response.setHeader('Content-Type', 'text/html');
      response.statusCode = 200;
      response.end(`<h1>upload success: ${filename}</h1>`);
    });

    // handle an error:
    parseForm.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });

    request.pipe(parseForm);

  // handle a 404 (page not found):
  } else {
    response.setHeader('Content-Type', 'text/html');
    response.statusCode = 404;
    response.end('<h1 class="result">404 Page not found.</h1>');
  }
});

server.listen(PORT);
