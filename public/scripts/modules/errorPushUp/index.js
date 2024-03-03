import { errorContainer } from './nodes.js';
import { createErrorElement } from './DOM.js';

export const errorHandler = (errorMessage) => {
  const message = errorMessage || 'Something went wrong';
  const removeError = () => errorContainer.removeChild(newErrorNode);
  const newErrorNode = createErrorElement(message, removeError);

  errorContainer.appendChild(newErrorNode);
};
