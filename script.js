let sliderPhotos = [];
let currentSlideIndex = 0;
let autoplayTimer = null;
let touchStartX = 0;
let touchEndX = 0;

async function loadPhotos() {
  const response = await fetch('./assets/photos.json');
  return response.json();
}

function renderSlider(photos) {
  const slides = document.getElementById('slides');
  const dots = document.getElementById('slide-dots');

  sliderPhotos = photos;

  slides.innerHTML = photos
    .map(
      (photo, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}" data-index="${index}">
          <img src="${photo.src}" alt="${photo.alt}" class="slide-image" />
        </div>
      `
    )
    .join('');

  dots.innerHTML = photos
    .map(
      (_, index) => `
        <button class="dot ${index === 0 ? 'active' : ''}" type="button" data-index="${index}" aria-label="${index + 1}번 사진"></button>
      `
    )
    .join('');

  dots.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      showSlide(Number(dot.dataset.index));
      resetAutoplay();
    });
  });
}

function showSlide(index) {
  if (!sliderPhotos.length) return;

  const safeIndex = (index + sliderPhotos.length) % sliderPhotos.length;
  currentSlideIndex = safeIndex;

  document.querySelectorAll('.slide').forEach((slide, slideIndex) => {
    slide.classList.toggle('active', slideIndex === safeIndex);
  });

  document.querySelectorAll('.dot').forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === safeIndex);
  });
}

function nextSlide() {
  showSlide(currentSlideIndex + 1);
}

function prevSlide() {
  showSlide(currentSlideIndex - 1);
}

function startAutoplay() {
  stopAutoplay();
  autoplayTimer = setInterval(nextSlide, 3200);
}

function stopAutoplay() {
  if (autoplayTimer) clearInterval(autoplayTimer);
}

function resetAutoplay() {
  startAutoplay();
}

function bindSliderEvents() {
  const slider = document.getElementById('photo-slider');
  document.getElementById('slide-next').addEventListener('click', () => {
    nextSlide();
    resetAutoplay();
  });
  document.getElementById('slide-prev').addEventListener('click', () => {
    prevSlide();
    resetAutoplay();
  });

  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  slider.addEventListener('touchend', (event) => {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
}

function handleSwipe() {
  const distance = touchEndX - touchStartX;
  if (Math.abs(distance) < 40) return;
  if (distance < 0) {
    nextSlide();
  } else {
    prevSlide();
  }
  resetAutoplay();
}

function renderGallery(photos) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = photos
    .map(
      (photo) => `
        <button class="gallery-item" type="button" data-src="${photo.src}" aria-label="${photo.alt}">
          <img loading="lazy" src="${photo.src}" alt="${photo.alt}" />
        </button>
      `
    )
    .join('');

  gallery.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => openLightbox(item.dataset.src, item.getAttribute('aria-label')));
  });
}

function openLightbox(src, alt) {
  const lightbox = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-image');
  image.src = src;
  image.alt = alt;
  lightbox.classList.remove('hidden');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-image');
  lightbox.classList.add('hidden');
  lightbox.setAttribute('aria-hidden', 'true');
  image.src = '';
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = '복사 완료';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1600);
  } catch {
    window.prompt('아래 내용을 복사해 주세요.', text);
  }
}

function bindCopyButtons() {
  document.querySelectorAll('.copy-button').forEach((button) => {
    button.addEventListener('click', () => copyText(button.dataset.copy, button));
  });
}

function bindLightboxEvents() {
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', (event) => {
    if (event.target.id === 'lightbox') closeLightbox();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
}

async function init() {
  const gallery = document.getElementById('gallery');

  try {
    const photos = await loadPhotos();
    renderSlider(photos);
    renderGallery(photos);
    bindSliderEvents();
    startAutoplay();
  } catch (error) {
    gallery.innerHTML = '<p>사진 목록을 불러오지 못했습니다. assets/photos.json 파일을 확인해 주세요.</p>';
    console.error(error);
  }

  bindCopyButtons();
  bindLightboxEvents();
}

init();
