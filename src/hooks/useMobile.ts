import { useEffect, useState } from 'react';

export const useMobile = (breakpoint: number = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const nextIsMobile = window.innerWidth < breakpoint;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setSidebarOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, [breakpoint]);

  return {
    isMobile,
    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((open) => !open),
    closeSidebar: () => setSidebarOpen(false),
  };
};
