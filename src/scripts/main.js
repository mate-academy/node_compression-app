'use strict';

const { makeCompressRequest } = require('./request');

const form = document.querySelector('form');
// eslint-disable-next-line no-undef
const formData = new FormData(form);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  makeCompressRequest(formData.get('file'), formData.get('compressType'));
});
