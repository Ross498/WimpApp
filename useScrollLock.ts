import { useEffect, useRef } from 'react';

/**
 * useScrollLock - Comprehensive scroll lock hook for modals
 * 
 * Prevents background scroll when modals are open and restores 
 * scroll position when modals close. Handles safe areas and 
 * ensures consistent behavior across all modal components.
 * 
 * @param isOpen - Whether the modal/overlay is currently open
 */
export function useScrollLock(isOpen: boolean) {
  const scrollY = useRef<number>(0);
  const wasLocked = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && !wasLocked.current) {
      // Store current scroll position
      scrollY.current = window.scrollY;
      wasLocked.current = true;
      
      // Lock body scroll with fixed positioning
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY.current}px`;
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Add modal-open class for additional CSS targeting
      document.body.classList.add('modal-open');
      
      console.log('🔒 Scroll locked at position:', scrollY.current);
    } else if (!isOpen && wasLocked.current) {
      // Restore scroll
      const storedScrollY = scrollY.current;
      wasLocked.current = false;
      
      // Remove body scroll lock
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.height = '';
      
      // Remove modal class
      document.body.classList.remove('modal-open');
      
      // Restore scroll position
      window.scrollTo(0, storedScrollY);
      
      console.log('🔓 Scroll unlocked, restored to position:', storedScrollY);
    }

    // Cleanup function for unmount
    return () => {
      if (wasLocked.current) {
        const storedScrollY = scrollY.current;
        wasLocked.current = false;
        
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.classList.remove('modal-open');
        
        window.scrollTo(0, storedScrollY);
      }
    };
  }, [isOpen]);

  return {
    isLocked: wasLocked.current,
    currentScrollY: scrollY.current
  };
}