import { qsa, copyText } from '../utils.js';

export function initClipboard() {
  qsa('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      await copyText(button.getAttribute('data-copy') || '');
    });
  });
}
