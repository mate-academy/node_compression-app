'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createErrorSender } = require('../../helpers/sendError');
const { mimeTypes } = require('./mimeTypes');
const inPublic = (filePath) => path.join('public', filePath);
const readFile = (filePath) => fs.readFile(inPublic(filePath), 'utf-8');

async function responseStaticFiles(request, response) {
  const sendError = createErrorSender(response);
  const { url, headers } = request;
  const { pathname } = new URL(url, `http://${headers.host}`);
  const filePath = url === '/' ? 'index.html' : pathname;
  const ext = path.extname(filePath);

  try {
    const file = await readFile(filePath);

    response.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    response.setHeader('Content-Length', Buffer.byteLength(file));

    response.end(file);
  } catch (error) {
    sendError(404, 'This page doesn\'t exist');
  }
}

module.exports = { responseStaticFiles };
