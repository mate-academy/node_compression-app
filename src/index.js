/* eslint-disable no-console */

'use strict';

const { createServer } = require('./createServer');

createServer().listen(5700, () => {
  console.log('Server started! 🚀');
  console.log('Available at http://localhost:5700');
});
