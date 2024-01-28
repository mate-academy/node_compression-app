'use strict';

const http = require('node:http');

const { handleRequest } = require('./controllers/app.controller');

const createServer = () => {
  const server = http.createServer();

  server.on('request', handleRequest);

  return server;
};

module.exports = {
  createServer,
};
