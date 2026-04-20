const sendTextResponse = (res, code, content, message) => {
  res.statusCode = code;

  if (message) {
    res.statusMessage = message;
  }

  res.setHeader('Content-Type', 'text/plain');

  res.end(content);
};

module.exports = { sendTextResponse };
