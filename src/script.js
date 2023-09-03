'use strict';

/* global FormData, fetch */

const form = document.getElementById('upload-form');
const input = document.getElementById('file');
const responseDiv = document.getElementById('response');

form.addEventListener('submit', async(event) => {
  event.preventDefault();
  responseDiv.textContent = 'Uploading and compressing...';

  const formData = new FormData(form);
  const response = await fetch('/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await response.text();

  responseDiv.textContent = result;

  setTimeout(() => {
    responseDiv.textContent = '';
    input.value = '';
  }, 5000);
});
