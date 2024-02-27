import { requestWithProgress } from "./requestWithProgress.js";
import { formElement } from './nodes.js';
import { createEnableHandler } from '../../helpers/enableHandler.js';

const handler = (event) => {
  event.preventDefault();
  requestWithProgress(formElement);
};

export const enableCustomForm = createEnableHandler(formElement, 'submit', handler);
