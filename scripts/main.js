function showToastFallback(message) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('is-visible');

  window.clearTimeout(showToastFallback._timer);
  showToastFallback._timer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2200);
}

async function safeImport(label, path) {
  try {
  return await import(path);
  } catch (error) {
    console.error(`[${label}] module import failed`, error);
    showToastFallback(`${label} 기능을 불러오지 못했습니다.`);
    return null;
  }
}

async function safeRun(label, task) {
  try {
    await task();
  } catch (error) {
    console.error(`[${label}] init failed`, error);
    showToastFallback(`${label} 기능 초기화 중 오류가 발생했습니다.`);
  }
}

async function init() {
  const [
    introModule,
    countdownModule,
    clipboardModule,
    mapsModule,
    guestbookModule,
    sliderModule,
    galleryModule
  ] = await Promise.all([
    safeImport('intro', './features/intro.js'),
    safeImport('countdown', './features/countdown.js'),
    safeImport('clipboard', './features/clipboard.js'),
    safeImport('maps', './features/maps.js'),
    safeImport('guestbook', './features/guestbook.js'),
    safeImport('slider', './features/slider.js'),
    safeImport('gallery', './features/gallery.js')
  ]);

  if (introModule?.initIntroParallax) {
    await safeRun('intro', async () => {
      introModule.initIntroParallax();
    });
  }

  if (countdownModule?.initCountdown) {
    await safeRun('countdown', async () => {
      countdownModule.initCountdown();
    });
  }

  if (clipboardModule?.initClipboard) {
    await safeRun('clipboard', async () => {
      clipboardModule.initClipboard();
    });
  }

  if (mapsModule?.initMaps) {
    await safeRun('maps', async () => {
      mapsModule.initMaps();
    });
  }

  if (guestbookModule?.initGuestbook) {
    await safeRun('guestbook', async () => {
      await guestbookModule.initGuestbook();
    });
  }

  if (sliderModule?.initSlider) {
    await safeRun('slider', async () => {
      await sliderModule.initSlider();
    });
  }

  if (sliderModule?.getSliderPhotos && galleryModule?.initGallery) {
    await safeRun('gallery', async () => {
      const photos = sliderModule.getSliderPhotos();
      galleryModule.initGallery(Array.isArray(photos) ? photos : []);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('[main] fatal init error', error);
    showToastFallback('페이지 초기화 중 오류가 발생했습니다.');
  });
});
