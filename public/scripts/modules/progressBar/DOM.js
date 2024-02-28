
import { progress, progressContainer } from './nodes.js';

export function setProgress(percent) {
  if (percent >= 100) {
    progress.style.width = '100%'
    return;
  }

  if (percent <= 0) {
    progress.style.width = '0%';
    return;
  }

  progress.style.width = `${percent}%`;
}

export function setProgressVisibility(show) {
  progressContainer.classList[show ? 'add' : 'remove']('progress-bar-show');
}
