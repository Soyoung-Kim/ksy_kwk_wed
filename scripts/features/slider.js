import { qs, qsa, escapeHtml } from '../utils.js';
import { supabaseClient } from '../supabaseClient.js';

const sliderState = {
  photos: [],
  allPhotos: [],
  currentSlide: 0,
  slideTimer: null,
  touchStartX: 0,
  usesManagedPhotos: false
};
let galleryPhotosUpdatedListener = null;

export async function initSlider() {
  const data = await loadLocalPhotos();
  sliderState.allPhotos = data;
  sliderState.photos = data;
  renderSlider(sliderState.photos);
  bindSliderControls();
  startSliderTimer();

  // Supabase 목록은 첫 화면을 막지 않고 뒤에서 받아 교체합니다.
  loadManagedPhotos().then((managedPhotos) => {
    if (!managedPhotos?.length) return;
    sliderState.allPhotos = managedPhotos;
    sliderState.photos = managedPhotos;
    sliderState.currentSlide = 0;
    sliderState.usesManagedPhotos = true;
    renderSlider(sliderState.photos);
    restartSliderTimer();
    galleryPhotosUpdatedListener?.(sliderState.allPhotos);
  }).catch(() => { /* Local photos remain available as a safe fallback. */ });
}

async function loadLocalPhotos() {
  const response = await fetch('./assets/photos.json', { cache: 'force-cache' });
  if (!response.ok) throw new Error('photos.json 파일을 불러오지 못했습니다.');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('photos.json 형식이 올바르지 않습니다.');
  return data;
}

async function loadManagedPhotos() {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from('wedding_gallery')
    .select('image_url, alt')
    .eq('is_visible', true)
    .order('display_order');

  if (error) return null;
  return Array.isArray(data) ? data.map((photo) => ({ src: photo.image_url, alt: photo.alt })) : [];
}

function createSlide(photo, index, eager = false) {
  return `
    <div class="slide" data-index="${index}">
      <img class="slide-image is-loading" src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || `웨딩 사진 ${index + 1}`)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />
    </div>
  `;
}

function renderSlider(photos) {
  const slidesEl = qs('#slides');
  const dotsEl = qs('#slide-dots');
  if (!slidesEl || !dotsEl || !photos.length) return;

  const loopPhotos = photos.length > 1
    ? [photos[photos.length - 1], ...photos, photos[0]]
    : photos;
  const firstPhotoIndex = photos.length > 1 ? 1 : 0;
  slidesEl.innerHTML = `<div class="slide-track">${loopPhotos.map((photo, index) => createSlide(photo, index, index === firstPhotoIndex)).join('')}</div>`;
  dotsEl.innerHTML = photos.map((_, index) => `
    <button type="button" class="dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="${index + 1}번 사진"></button>
  `).join('');

  setTrackPosition(0, false);
  qsa('#slide-dots .dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      goToSlide(Number(dot.dataset.index || 0));
      restartSliderTimer();
    });
  });

  qsa('#slides .slide-image').forEach((image) => {
    const finishLoading = () => image.classList.remove('is-loading');
    if (image.complete) finishLoading();
    image.addEventListener('load', finishLoading, { once: true });
    image.addEventListener('error', finishLoading, { once: true });
  });

  qs('#slides .slide-track')?.addEventListener('transitionend', () => {
    const total = sliderState.photos.length;
    if (sliderState.currentSlide === -1) {
      sliderState.currentSlide = total - 1;
      setTrackPosition(sliderState.currentSlide, false);
    } else if (sliderState.currentSlide === total) {
      sliderState.currentSlide = 0;
      setTrackPosition(0, false);
    }
  });
}

function setTrackPosition(index, animate = true) {
  const track = qs('#slides .slide-track');
  if (!track) return;
  track.style.transition = animate ? 'transform 560ms cubic-bezier(.22,.61,.36,1)' : 'none';
  const offset = sliderState.photos.length > 1 ? index + 1 : index;
  track.style.transform = `translate3d(-${offset * 100}%, 0, 0)`;
}

function updateDots(index) {
  const total = sliderState.photos.length;
  const normalized = (index + total) % total;
  qsa('#slide-dots .dot').forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === normalized);
  });
}

function goToSlide(index) {
  const total = sliderState.photos.length;
  if (!total) return;
  sliderState.currentSlide = index;
  updateDots(index);
  setTrackPosition(index);
}

function nextSlide() {
  goToSlide(sliderState.currentSlide + 1);
}

function prevSlide() {
  goToSlide(sliderState.currentSlide - 1);
}

function startSliderTimer() {
  stopSliderTimer();
  if (sliderState.photos.length > 1) sliderState.slideTimer = setInterval(nextSlide, 3800);
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
  prevBtn?.addEventListener('click', () => { prevSlide(); restartSliderTimer(); });
  nextBtn?.addEventListener('click', () => { nextSlide(); restartSliderTimer(); });
  if (!slider) return;

  slider.addEventListener('mouseenter', stopSliderTimer);
  slider.addEventListener('mouseleave', startSliderTimer);
  slider.addEventListener('touchstart', (event) => {
    sliderState.touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  slider.addEventListener('touchend', (event) => {
    const diff = event.changedTouches[0].clientX - sliderState.touchStartX;
    if (Math.abs(diff) < 36) return;
    if (diff < 0) nextSlide(); else prevSlide();
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
