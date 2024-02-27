
import { createEnableHandler } from '../../helpers/enableHandler.js';
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
