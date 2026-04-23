const input = document.querySelector('.file__input');
const fileStatus = document.querySelector('.file__status');

input.addEventListener('change', () => {
  if (input.files.length > 0) {
    fileStatus.textContent = input.files[0].name;
  }
});
