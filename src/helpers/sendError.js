'use strict';

function createErrorSender(response) {
  return (statusCode, message) => {
    response.statusCode = statusCode;
    response.end(message);
  };
}

module.exports = { createErrorSender };
