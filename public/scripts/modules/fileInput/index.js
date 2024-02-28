
import { createEnableHandler } from '../../helpers/enableHandler.js';
import { errorHandler } from '../errorPushUp/index.js';
import { fileInput, fileLabel } from './nodes.js';

function setFileNameInLabel() {
  const { files } = this;
  const fileExist = !!(files && files.length > 0);
  const filesNames = [...files].map(({ name }) => name).join(', \n');
  const filesText = fileExist ? files[0].name : 'or drag it here.';
  
  fileLabel.title = filesNames;
  fileLabel.textContent = filesText;
}

export const enableFileNameInLabel = createEnableHandler(
  fileInput, 'change', setFileNameInLabel
);

export const checkIfFileProvided = () => {
  const fileExist = !!(fileInput.value);

  if (!fileExist) {
    fileLabel.style.border = '2px solid red';

    errorHandler('No file selected. It is required!');

    setTimeout(() => {
      fileLabel.style.border = null;
    }, 2000);
  }

  return fileExist;
};
