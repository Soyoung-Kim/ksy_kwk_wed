function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function initIntroParallax() {
  const coverStage = document.getElementById('invitation-cover');
  const coverInner = coverStage?.querySelector('.invitation-cover-inner');

  if (!coverStage || !coverInner) {
    return;
  }

  function applyCoverTransition() {
    const rect = coverStage.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const scrollable = Math.max(coverStage.offsetHeight - viewportHeight, 1);
    const progress = clamp((-rect.top) / scrollable, 0, 1);
    coverInner.style.transform = `translate3d(0, ${progress * -24}px, 0) scale(${1 - progress * 0.025})`;
    coverInner.style.opacity = String(1 - progress * 0.72);
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;

    ticking = true;
    window.requestAnimationFrame(() => {
      applyCoverTransition();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', applyCoverTransition);
  applyCoverTransition();
}
