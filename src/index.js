/* eslint-disable no-console */
'use strict';

const PORT = process.env.PORT || 3000;
const server = require('./server');

server.listen(PORT, () => {
  console.log(`The server is running on http://localhost:${PORT}`, '🚀');
});

server.on('error', () => {});
