import { qs, qsa, escapeHtml } from '../utils.js';
import { supabaseClient } from '../supabaseClient.js';

const sliderState = {
  photos: [],
  allPhotos: [],
  currentSlide: 0,
  slideTimer: null,
  touchStartX: 0,
  isAnimating: false,
  usesManagedPhotos: false
};
let galleryPhotosUpdatedListener = null;

export async function initSlider() {
  const data = await loadLocalPhotos();
  sliderState.allPhotos = data;
  sliderState.photos = data;
  renderSlider();
  bindSliderControls();
  startSliderTimer();

  // Supabase 목록은 첫 화면을 막지 않고 뒤에서 받아 교체합니다.
  loadManagedPhotos().then((managedPhotos) => {
    if (!managedPhotos?.length) return;
    sliderState.allPhotos = managedPhotos;
    sliderState.photos = managedPhotos;
    sliderState.currentSlide = 0;
    sliderState.usesManagedPhotos = true;
    renderSlider();
    restartSliderTimer();
    galleryPhotosUpdatedListener?.(sliderState.allPhotos);
  }).catch(() => { /* Local photos remain available as a safe fallback. */ });
}

function fileNumber(photo) {
  const match = String(photo?.src || '').match(/\/(\d+)\.[a-z]+(?:\?.*)?$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function loadLocalPhotos() {
  const response = await fetch('./assets/photos.json', { cache: 'force-cache' });
  if (!response.ok) throw new Error('photos.json 파일을 불러오지 못했습니다.');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('photos.json 형식이 올바르지 않습니다.');
  return data.sort((left, right) => fileNumber(left) - fileNumber(right));
}

async function loadManagedPhotos() {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from('wedding_gallery')
    .select('image_url, thumbnail_url, alt')
    .eq('is_visible', true)
    .order('display_order');

  if (error) return null;
  return Array.isArray(data) ? data.map((photo) => ({
    src: photo.image_url,
    thumb: photo.thumbnail_url || photo.image_url,
    alt: photo.alt
  })) : [];
}

function normalizedIndex(index) {
  const total = sliderState.photos.length;
  return total ? (index + total) % total : 0;
}

function createSlide(photo, index) {
  return `
    <div class="slide" data-index="${index}">
      <img class="slide-image is-loading" src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || `웨딩 사진 ${index + 1}`)}" loading="${index === sliderState.currentSlide ? 'eager' : 'lazy'}" decoding="async" />
    </div>
  `;
}

function renderWindow() {
  const slidesEl = qs('#slides');
  if (!slidesEl || !sliderState.photos.length) return;

  const previous = normalizedIndex(sliderState.currentSlide - 1);
  const next = normalizedIndex(sliderState.currentSlide + 1);
  const windowIndexes = sliderState.photos.length > 1
    ? [previous, sliderState.currentSlide, next]
    : [sliderState.currentSlide];

  slidesEl.innerHTML = `<div class="slide-track${windowIndexes.length === 1 ? ' single' : ''}">${windowIndexes
    .map((index) => createSlide(sliderState.photos[index], index))
    .join('')}</div>`;
  setTrackPosition(windowIndexes.length === 1 ? 0 : 1, false);

  qsa('#slides .slide-image').forEach((image) => {
    const finishLoading = () => image.classList.remove('is-loading');
    if (image.complete) finishLoading();
    image.addEventListener('load', finishLoading, { once: true });
    image.addEventListener('error', finishLoading, { once: true });
  });
}

function renderDots() {
  const dotsEl = qs('#slide-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = `<span class="slider-count" aria-live="polite">${sliderState.currentSlide + 1} / ${sliderState.photos.length}</span>`;
}

function renderSlider() {
  if (!sliderState.photos.length) return;
  renderWindow();
  renderDots();
}

function setTrackPosition(position, animate = true) {
  const track = qs('#slides .slide-track');
  if (!track) return;
  track.style.transition = animate ? 'transform 420ms cubic-bezier(.22,.61,.36,1)' : 'none';
  track.style.transform = `translate3d(-${position * (100 / 3)}%, 0, 0)`;
}

function updateDots() {
  const count = qs('#slide-dots .slider-count');
  if (count) count.textContent = `${sliderState.currentSlide + 1} / ${sliderState.photos.length}`;
}

function showSlide(index) {
  if (!sliderState.photos.length) return;
  sliderState.currentSlide = normalizedIndex(index);
  sliderState.isAnimating = false;
  renderWindow();
  updateDots();
}

function moveSlide(direction) {
  if (sliderState.isAnimating || sliderState.photos.length < 2) return;
  sliderState.isAnimating = true;
  sliderState.currentSlide = normalizedIndex(sliderState.currentSlide + direction);
  updateDots();
  setTrackPosition(direction > 0 ? 2 : 0, true);

  const track = qs('#slides .slide-track');
  const settle = () => {
    if (!sliderState.isAnimating) return;
    sliderState.isAnimating = false;
    renderWindow();
  };
  track?.addEventListener('transitionend', settle, { once: true });
  window.setTimeout(settle, 520);
}

function nextSlide() {
  moveSlide(1);
}

function prevSlide() {
  moveSlide(-1);
}

function startSliderTimer() {
  stopSliderTimer();
  if (sliderState.photos.length > 1) sliderState.slideTimer = window.setInterval(nextSlide, 5200);
}

function stopSliderTimer() {
  if (sliderState.slideTimer) window.clearInterval(sliderState.slideTimer);
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
  prevBtn?.addEventListener('click', () => { prevSlide(); restartSliderTimer(); });
  nextBtn?.addEventListener('click', () => { nextSlide(); restartSliderTimer(); });
  if (!slider) return;

  slider.addEventListener('mouseenter', stopSliderTimer);
  slider.addEventListener('mouseleave', startSliderTimer);
  slider.addEventListener('touchstart', (event) => {
    sliderState.touchStartX = event.changedTouches[0].clientX;
    stopSliderTimer();
  }, { passive: true });
  slider.addEventListener('touchend', (event) => {
    const diff = event.changedTouches[0].clientX - sliderState.touchStartX;
    if (Math.abs(diff) >= 36) {
      if (diff < 0) nextSlide(); else prevSlide();
    }
    restartSliderTimer();
  }, { passive: true });
}

export function getGalleryPhotos() {
  return sliderState.allPhotos || [];
}

export function onGalleryPhotosUpdated(listener) {
  galleryPhotosUpdatedListener = listener;
  if (sliderState.usesManagedPhotos) galleryPhotosUpdatedListener(sliderState.allPhotos);
}
