function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function initIntroParallax() {
  const stage = document.getElementById('intro-stage');
  const media = document.getElementById('intro-media');
  const copy = document.getElementById('intro-copy');
  const overlay = stage?.querySelector('.intro-overlay');

  if (!stage || !media || !copy) {
    return;
  }

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function applyParallax() {
    const rect = stage.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const scrollable = Math.max(stage.offsetHeight - viewportHeight, 1);
    const progress = clamp((-rect.top) / scrollable, 0, 1);

    const mobile = isMobile();

    const mediaScale = mobile ? 1 + progress * 0.012 : 1 + progress * 0.06;
    const mediaShiftY = mobile ? progress * 8 : progress * 24;
    const copyShiftY = mobile ? progress * 18 : progress * 42;
    const copyOpacity = 1 - progress * 0.78;
    const overlayOpacity = mobile ? 0.05 + progress * 0.04 : 0.08 + progress * 0.07;

    media.style.transform = `translate3d(0, ${mediaShiftY}px, 0) scale(${mediaScale})`;
    copy.style.transform = `translate3d(0, ${copyShiftY}px, 0)`;
    copy.style.opacity = String(copyOpacity);

    if (overlay) {
      overlay.style.opacity = String(overlayOpacity);
    }
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;

    ticking = true;
    window.requestAnimationFrame(() => {
      applyParallax();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', applyParallax);
  applyParallax();
}
