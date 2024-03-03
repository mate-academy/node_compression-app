import { requestWithProgress } from "./requestWithProgress.js";
import { formElement } from './nodes.js';
import { createEnableHandler } from '../../helpers/enableHandler.js';
import { checkIfFileProvided } from "../fileInput/index.js";

const submitHandler = (event) => {
  event.preventDefault();

  if (checkIfFileProvided()) {
    requestWithProgress(formElement);
  }
};

export const enableCustomForm = createEnableHandler(formElement, 'submit', submitHandler);
