/* eslint-disable no-console */
/* Don't change code below */

'use strict';

const { createServer } = require('./createServer');

createServer()
  .listen(process.env.PORT || 5700, () => {
    console.log('Server started! 🚀');
    console.log(`Available at http://localhost:${process.env.PORT || 5700}`);
  });
