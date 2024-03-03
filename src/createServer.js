'use strict';

const http = require('http');

/* eslint-disable max-len */
const { responseCompressor } = require('./responses/responseCompressor/index');
const { responseStaticFiles } = require('./responses/responseStaticFiles/index');

function createServer() {
  const server = http.createServer((request, response) => {
    if (request.url === '/compress') {
      responseCompressor(request, response);
    } else {
      responseStaticFiles(request, response);
    }
  });

  /* eslint-disable-next-line no-console */
  server.on('error', console.error);

  return server;
}

module.exports = {
  createServer,
};
