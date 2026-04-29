import { qs, qsa, escapeHtml } from '../utils.js';

export function initGallery(photos) {
  const gallery = qs('#gallery');
  if (!gallery) return;

  gallery.innerHTML = photos.map((photo, index) => `
    <button type="button" class="gallery-item" data-src="${escapeHtml(photo.src)}" data-alt="${escapeHtml(photo.alt || `웨딩 사진 ${index + 1}`)}">
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || `웨딩 사진 ${index + 1}`)}" loading="lazy" />
    </button>
  `).join('');

  qsa('#gallery .gallery-item').forEach((item) => {
    item.addEventListener('click', () => openLightbox(item.dataset.src || '', item.dataset.alt || '확대 이미지'));
  });

  bindLightbox();
}

function openLightbox(src, alt) {
  const lightbox = qs('#lightbox');
  const image = qs('#lightbox-image');
  if (!lightbox || !image) return;

  image.src = src;
  image.alt = alt;
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = qs('#lightbox');
  const image = qs('#lightbox-image');
  if (!lightbox || !image) return;

  lightbox.classList.add('hidden');
  image.src = '';
  document.body.style.overflow = '';
}

function bindLightbox() {
  const closeBtn = qs('#lightbox-close');
  const lightbox = qs('#lightbox');

  closeBtn?.addEventListener('click', closeLightbox);

  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
}
