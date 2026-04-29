let sliderPhotos = [];
let currentSlideIndex = 0;
let autoplayTimer = null;
let touchStartX = 0;
let touchEndX = 0;

async function loadPhotos() {
  const response = await fetch("./assets/photos.json");
  if (!response.ok) {
    throw new Error("photos.json을 불러올 수 없습니다.");
  }
  return response.json();
}

function renderSlider(photos) {
  const slides = document.getElementById("slides");
  const dots = document.getElementById("slide-dots");
  const prevBtn = document.getElementById("slide-prev");
  const nextBtn = document.getElementById("slide-next");

  sliderPhotos = photos;

  slides.innerHTML = photos
    .map(
      (photo, index) => `
        <div class="slide ${index === 0 ? "active" : ""}" data-index="${index}">
          <img class="slide-image" src="${photo.src}" alt="${photo.alt}" />
        </div>
      `
    )
    .join("");

  dots.innerHTML = photos
    .map(
      (_, index) => `
        <button
          class="dot ${index === 0 ? "active" : ""}"
          type="button"
          data-index="${index}"
          aria-label="${index + 1}번 사진"
        ></button>
      `
    )
    .join("");

  dots.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.index));
      resetAutoplay();
    });
  });

  if (photos.length <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    dots.style.display = "none";
  }
}

function showSlide(index) {
  if (!sliderPhotos.length) return;

  const safeIndex = (index + sliderPhotos.length) % sliderPhotos.length;
  currentSlideIndex = safeIndex;

  document.querySelectorAll(".slide").forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === safeIndex);
  });

  document.querySelectorAll(".dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === safeIndex);
  });
}

function nextSlide() {
  showSlide(currentSlideIndex + 1);
}

function prevSlide() {
  showSlide(currentSlideIndex - 1);
}

function startAutoplay() {
  if (sliderPhotos.length <= 1) return;
  stopAutoplay();
  autoplayTimer = setInterval(nextSlide, 3400);
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function resetAutoplay() {
  stopAutoplay();
  startAutoplay();
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

function bindSliderEvents() {
  const slider = document.getElementById("photo-slider");
  const nextBtn = document.getElementById("slide-next");
  const prevBtn = document.getElementById("slide-prev");

  nextBtn.addEventListener("click", () => {
    nextSlide();
    resetAutoplay();
  });

  prevBtn.addEventListener("click", () => {
    prevSlide();
    resetAutoplay();
  });

  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);

  slider.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].screenX;
    },
    { passive: true }
  );

  slider.addEventListener(
    "touchend",
    (event) => {
      touchEndX = event.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });
}

function renderGallery(photos) {
  const gallery = document.getElementById("gallery");

  gallery.innerHTML = photos
    .map(
      (photo) => `
        <button
          class="gallery-item"
          type="button"
          data-src="${photo.src}"
          aria-label="${photo.alt}"
        >
          <img loading="lazy" src="${photo.src}" alt="${photo.alt}" />
        </button>
      `
    )
    .join("");

  gallery.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      openLightbox(item.dataset.src, item.getAttribute("aria-label"));
    });
  });
}

function openLightbox(src, alt) {
  const lightbox = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-image");

  image.src = src;
  image.alt = alt;
  lightbox.classList.remove("hidden");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-image");

  lightbox.classList.add("hidden");
  lightbox.setAttribute("aria-hidden", "true");
  image.src = "";
  document.body.style.overflow = "";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1600);
}

async function copyText(text, button) {
  const originalText = button.textContent;

  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "복사 완료";
    showToast("복사되었습니다");
    setTimeout(() => {
      button.textContent = originalText;
    }, 1400);
  } catch (error) {
    window.prompt("아래 내용을 복사해 주세요.", text);
  }
}

function bindCopyButtons() {
  document.querySelectorAll(".copy-button").forEach((button) => {
    button.addEventListener("click", () => {
      copyText(button.dataset.copy, button);
    });
  });
}

function bindLightboxEvents() {
  const lightbox = document.getElementById("lightbox");
  const closeBtn = document.getElementById("lightbox-close");

  closeBtn.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target.id === "lightbox") {
      closeLightbox();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });
}

function bindIntroParallax() {
  const stage = document.getElementById("intro-stage");
  const media = document.getElementById("intro-media");
  const copy = document.getElementById("intro-copy");

  if (!stage || !media || !copy) return;

  let ticking = false;

  function updateIntro() {
    const rect = stage.getBoundingClientRect();
    const total = stage.offsetHeight - window.innerHeight;

    if (total <= 0) {
      ticking = false;
      return;
    }

    const progress = Math.min(Math.max(-rect.top / total, 0), 1);

    const mediaTranslate = progress * 22;
    const mediaScale = 1.08 - progress * 0.08;
    const mediaOpacity = 1 - progress * 0.18;

    const copyTranslate = progress * 64;
    const copyOpacity = 1 - progress * 1.05;

    media.style.transform = `translate3d(0, ${mediaTranslate}px, 0) scale(${mediaScale})`;
    media.style.opacity = String(Math.max(mediaOpacity, 0.82));

    copy.style.transform = `translate3d(0, ${copyTranslate}px, 0)`;
    copy.style.opacity = String(Math.max(copyOpacity, 0));
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateIntro();
        ticking = false;
      });
      ticking = true;
    }
  }

  updateIntro();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

function bindWeddingCountdown() {
  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");
  const minutesEl = document.getElementById("countdown-minutes");
  const secondsEl = document.getElementById("countdown-seconds");
  const ddayEl = document.getElementById("countdown-dday");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl || !ddayEl) return;

  const weddingDate = new Date("2026-11-08T11:30:00+09:00").getTime();

  function updateCountdown() {
    const now = Date.now();
    const distance = weddingDate - now;

    if (distance <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      ddayEl.textContent = "소영 ❤ 우경의 결혼식이 오늘입니다.";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(seconds).padStart(2, "0");

    ddayEl.textContent = `소영 ❤ 우경의 결혼식이 D-${days}일 남았습니다.`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

async function init() {
  const gallery = document.getElementById("gallery");

  try {
    const photos = await loadPhotos();
    renderSlider(photos);
    renderGallery(photos);
    bindSliderEvents();
    startAutoplay();
  } catch (error) {
    console.error(error);
    gallery.innerHTML = `
      <div class="gallery-item" style="padding:16px; grid-column:1 / -1;">
        <p style="margin:0; line-height:1.7;">사진 목록을 불러오지 못했습니다. assets/photos.json 파일과 사진 경로를 확인해 주세요.</p>
      </div>
    `;
  }

  bindCopyButtons();
  bindLightboxEvents();
  bindIntroParallax();
  bindWeddingCountdown();
}

init();
