'use strict';

function setContentAttachment(res, filename) {
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
};

module.exports = { setContentAttachment };
