/* eslint-disable no-console */
/* Don't change code below */

'use strict';

const { createServer } = require('./createServer');

createServer().listen(5700, () => {
  console.log('Server started! 🚀');
  console.log('Available at http://localhost:5700');
});

/* const createServer = require('./createServer');

const PORT = process.env.PORT || 3000;
const server = createServer();

server.listen(PORT, () => {
  console.log(`Compression server running at http://localhost:${PORT}`);
}); */
