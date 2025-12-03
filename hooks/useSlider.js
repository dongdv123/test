import { useCallback, useRef } from "react";

/**
 * Custom hook for managing slider/carousel functionality
 * Used for product sliders on homepage and product detail pages
 */
export const useSlider = () => {
  const trackRefs = useRef({});
  const positions = useRef({});

  const registerTrack = useCallback((key) => (el) => {
    if (el) {
      trackRefs.current[key] = el;
    }
  }, []);

  const slide = useCallback((key, direction) => {
    const track = trackRefs.current[key];
    if (!track || !track.children.length) return;

    const cardWidth = track.children[0].getBoundingClientRect().width;
    const computed = window.getComputedStyle(track);
    const gap = parseFloat(computed.gap) || parseFloat(computed.columnGap) || 0;
    const step = cardWidth + gap;
    const visible = Math.max(1, Math.floor(track.clientWidth / step));
    const maxIndex = Math.max(track.children.length - visible, 0);

    if (!(key in positions.current)) positions.current[key] = 0;
    positions.current[key] += direction;
    if (positions.current[key] < 0) positions.current[key] = maxIndex;
    if (positions.current[key] > maxIndex) positions.current[key] = 0;

    track.scrollTo({
      left: positions.current[key] * step,
      behavior: "smooth",
    });
  }, []);

  const hasMultipleSlides = useCallback((items, minVisible) => {
    if (!items || !items.length) return false;
    return items.length > minVisible;
  }, []);

  return {
    registerTrack,
    slide,
    hasMultipleSlides,
  };
};

