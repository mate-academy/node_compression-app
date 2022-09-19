'use strict';

const form = document.querySelector('.compress-form');
const fileinput = form.querySelector('.file-input');
const filename = form.querySelector('.file-name');
const compression = form.querySelector('.compression-method');
const submitBtn = form.querySelector('.upload');

const toggleSubmitBtn = () => {
  submitBtn.toggleAttribute('disabled', !compression.value || !fileinput.value);
};

form.addEventListener('submit', () => {
  submitBtn.classList.toggle('is-loading', true);

  setTimeout(() => {
    form.reset();
    filename.textContent = 'No file selected';
    submitBtn.classList.toggle('is-loading', false);
    toggleSubmitBtn();
  }, 1000);
});

fileinput.addEventListener('change', (event) => {
  filename.textContent = event.target.files.length
    ? event.target.files[0].name
    : 'No file selected';
  toggleSubmitBtn();
});

compression.addEventListener('change', toggleSubmitBtn);
