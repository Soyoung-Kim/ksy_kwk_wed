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
function initInteractionGuard() {
  // 전체 우클릭 방지
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // 이미지 드래그 방지
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.preventDefault();
    }
  });
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
    directoryModule,
    shareModule,
    mapsModule,
    guestbookModule,
    sliderModule,
    galleryModule
  ] = await Promise.all([
    safeImport('intro', './features/intro.js'),
    safeImport('countdown', './features/countdown.js'),
    safeImport('clipboard', './features/clipboard.js'),
    safeImport('directory', './features/directory.js'),
    safeImport('share', './features/share.js'),
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

  if (directoryModule?.initDirectory) {
    await safeRun('directory', async () => {
      await directoryModule.initDirectory();
    });
  }

  if (shareModule?.initShare) {
    await safeRun('share', async () => {
      shareModule.initShare();
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

  if (sliderModule?.getGalleryPhotos && galleryModule?.initGallery) {
    await safeRun('gallery', async () => {
      const photos = sliderModule.getGalleryPhotos();
      galleryModule.initGallery(Array.isArray(photos) ? photos : []);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initInteractionGuard();
  init().catch((error) => {
    console.error('[main] fatal init error', error);
    showToastFallback('페이지 초기화 중 오류가 발생했습니다.');
  });
});
