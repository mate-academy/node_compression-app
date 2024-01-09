/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');

const makeCompressRequest = (file, compressType) => {
  const url = 'http://localhost:8080';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  const fileStream = fs.createReadStream(file);
  const compressTypetream = fs.createReadStream(compressType);
  const request = http.request(url, options, (res) => {
    res.on('data', (chunk) => {
      console.log(`Response from server: ${chunk}`);
    });
  });

  fileStream.pipe(request);
  compressTypetream.pipe(request);
  request.end();
};

module.exports = { makeCompressRequest };
