/**
 * Marks the page while the reader is scrolling (`html[data-scrolling]`), so CSS can pause ambient loops
 * (glows, sheens, twinkles) for the length of the scroll and give the frame budget to the scroll itself.
 * The marker is removed 160 ms after the last scroll event; the loops resume where they paused.
 */
export function watchScrollState(): () => void {
  if (typeof window === 'undefined') return () => {};
  const root = document.documentElement;
  let timer = 0;
  const onScroll = () => {
    if (!root.hasAttribute('data-scrolling')) root.setAttribute('data-scrolling', '');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => root.removeAttribute('data-scrolling'), 160);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.clearTimeout(timer);
    root.removeAttribute('data-scrolling');
  };
}
