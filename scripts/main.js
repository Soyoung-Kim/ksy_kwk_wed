import { initIntroParallax } from './features/intro.js';
import { initCountdown } from './features/countdown.js';
import { initSlider, getSliderPhotos } from './features/slider.js';
import { initGallery } from './features/gallery.js';
import { initClipboard } from './features/clipboard.js';
import { initMaps } from './features/maps.js';
import { initGuestbook } from './features/guestbook.js';
import { showToast } from './utils.js';

async function init() {
  initIntroParallax();
  initCountdown();
  initClipboard();
  initMaps();

  try {
    await initGuestbook();
  } catch (error) {
    console.error(error);
    showToast('방명록을 초기화하지 못했습니다.');
  }

  try {
    await initSlider();
    initGallery(getSliderPhotos());
  } catch (error) {
    console.error(error);
    showToast('사진을 불러오지 못했습니다.');
  }
}

document.addEventListener('DOMContentLoaded', init);
