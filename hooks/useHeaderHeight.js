import { useEffect } from 'react';

/**
 * Custom hook to calculate and update header height CSS variable
 * Updates header height on mount, resize, and scroll events
 * Uses requestAnimationFrame for performance optimization
 */
export function useHeaderHeight() {
  useEffect(() => {
    let ticking = false;
    
    const updateHeaderHeight = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const header = document.querySelector('.header');
          if (header) {
            const headerRect = header.getBoundingClientRect();
            const headerHeight = headerRect.height;
            document.documentElement.style.setProperty(
              '--header-height',
              `${headerHeight}px`
            );
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial update
    updateHeaderHeight();

    // Update on resize and scroll
    window.addEventListener('resize', updateHeaderHeight, { passive: true });
    window.addEventListener('scroll', updateHeaderHeight, { passive: true });

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      window.removeEventListener('scroll', updateHeaderHeight);
    };
  }, []);
}

