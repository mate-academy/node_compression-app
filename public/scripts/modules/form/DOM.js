import { formElement } from "./nodes.js";

export function disableForm(disabled = true) {
  [...formElement.elements].forEach(element => {
    element.disabled = disabled;
  });
}