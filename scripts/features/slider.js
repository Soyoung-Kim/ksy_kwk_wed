import { qs, qsa, escapeHtml } from '../utils.js';

const sliderState = {
  photos: [],
  currentSlide: 0,
  slideTimer: null,
  touchStartX: 0
};

export async function initSlider() {
  const response = await fetch('./assets/photos.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('photos.json 파일을 불러오지 못했습니다.');

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('photos.json 형식이 올바르지 않습니다.');

  sliderState.photos = data;
  renderSlider(data);
  bindSliderControls();
  startSliderTimer();
}

function renderSlider(photos) {
  const slidesEl = qs('#slides');
  const dotsEl = qs('#slide-dots');
  if (!slidesEl || !dotsEl) return;

  slidesEl.innerHTML = photos.map((photo, index) => `
    <div class="slide ${index === 0 ? 'active' : ''}" data-index="${index}">
      <img class="slide-image" src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || `웨딩 사진 ${index + 1}`)}" loading="${index === 0 ? 'eager' : 'lazy'}" />
    </div>
  `).join('');

  dotsEl.innerHTML = photos.map((_, index) => `
    <button type="button" class="dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="${index + 1}번 사진"></button>
  `).join('');

  qsa('#slide-dots .dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      goToSlide(Number(dot.dataset.index || 0));
      restartSliderTimer();
    });
  });
}

function goToSlide(index) {
  const total = sliderState.photos.length;
  if (!total) return;

  const nextIndex = (index + total) % total;
  sliderState.currentSlide = nextIndex;

  qsa('#slides .slide').forEach((slide, i) => slide.classList.toggle('active', i === nextIndex));
  qsa('#slide-dots .dot').forEach((dot, i) => dot.classList.toggle('active', i === nextIndex));
}

function nextSlide() {
  goToSlide(sliderState.currentSlide + 1);
}

function prevSlide() {
  goToSlide(sliderState.currentSlide - 1);
}

function startSliderTimer() {
  stopSliderTimer();
  sliderState.slideTimer = setInterval(nextSlide, 3400);
}

function stopSliderTimer() {
  if (sliderState.slideTimer) clearInterval(sliderState.slideTimer);
  sliderState.slideTimer = null;
}

function restartSliderTimer() {
  stopSliderTimer();
  startSliderTimer();
}

function bindSliderControls() {
  const prevBtn = qs('#slide-prev');
  const nextBtn = qs('#slide-next');
  const slider = qs('#photo-slider');

  prevBtn?.addEventListener('click', () => {
    prevSlide();
    restartSliderTimer();
  });

  nextBtn?.addEventListener('click', () => {
    nextSlide();
    restartSliderTimer();
  });

  if (!slider) return;

  slider.addEventListener('mouseenter', stopSliderTimer);
  slider.addEventListener('mouseleave', startSliderTimer);

  slider.addEventListener('touchstart', (event) => {
    sliderState.touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  slider.addEventListener('touchend', (event) => {
    const diff = event.changedTouches[0].clientX - sliderState.touchStartX;
    if (Math.abs(diff) < 36) return;
    if (diff < 0) nextSlide();
    else prevSlide();
    restartSliderTimer();
  }, { passive: true });
}

export function getSliderPhotos() {
  return sliderState.photos;
}
