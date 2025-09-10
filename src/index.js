/* eslint-disable no-console */
/* Don't change code below */

'use strict';

const { createServer } = require('./createServer');
const PORT = process.env.PORT || 5700;

const server = createServer();

server.listen(PORT);
