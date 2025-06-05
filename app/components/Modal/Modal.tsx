import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const Modal = ({ open, onClose, children, className = '' }: ModalProps) => {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [dragTargetIsInteractive, setDragTargetIsInteractive] = useState(false);

  const CLOSE_THRESHOLD = 100;
  const FULLSCREEN_THRESHOLD = -80;

  // Helper to check if an element is interactive (scrollable, input, etc.)
  const isInteractiveElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;

    // Check for map elements (leaflet specific)
    if (element.classList.contains('leaflet-container') ||
      element.closest('.leaflet-container') ||
      element.closest('.imagePreviewContainer')) return true;

    // Check for scrollable elements
    const style = window.getComputedStyle(element);
    const isScrollable = ['auto', 'scroll'].includes(style.overflowY) ||
      ['auto', 'scroll'].includes(style.overflowX);

    return isScrollable;
  }, []);

  // Detect if we're on desktop
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);

    return () => {
      window.removeEventListener('resize', checkIfDesktop);
    };
  }, []);

  // Handle scroll events to detect if content is at the top
  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const isTop = contentRef.current.scrollTop === 0;
      setIsAtTop(isTop);
    }
  }, []);

  // Handle open state
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
      // Apply the open class after a small delay to trigger the transition
      setTimeout(() => {
        setOffset(0);
        setDragging(false);
        setDragStart(null);
      }, 10);
    } else {
      setIsVisible(false);
      setIsFullscreen(false);
    }
  }, [open]);

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsFullscreen(false);
    }, 300); // Match the duration in CSS (0.3s)
  };

  const getEventPosition = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  };

  const handleDragStart = useCallback((positionX: number, positionY: number, target: Element | null) => {
    // Check if we're starting to drag from an interactive element
    const isInteractive = isInteractiveElement(target);
    setDragTargetIsInteractive(isInteractive);

    // Don't initiate dragging if we're interacting with an interactive element
    if (isInteractive) return;

    // Only allow drag start from top if we're in fullscreen and at the top of the content
    if (isFullscreen && !isAtTop && !isDesktop) {
      return;
    }

    const positionValue = isDesktop ? positionX : positionY;
    setDragStart(positionValue);
    setDragging(true);
  }, [isDesktop, isFullscreen, isAtTop, isInteractiveElement]);

  const handleDragMove = useCallback((positionX: number, positionY: number) => {
    if (dragStart === null || !dragging || dragTargetIsInteractive) return;

    if (isDesktop) {
      const newOffset = Math.max(0, positionX - dragStart);
      setOffset(newOffset);
    } else {
      let newOffset = positionY - dragStart;
      if (isFullscreen) {
        newOffset = Math.max(0, newOffset);
      }
      setOffset(newOffset);
    }
  }, [dragStart, dragging, isDesktop, isFullscreen, dragTargetIsInteractive]);

  const handleDragEnd = useCallback(() => {
    if (dragTargetIsInteractive) {
      setDragTargetIsInteractive(false);
      return;
    }

    if (!isDesktop) {
      if (isFullscreen) {
        if (offset > window.innerHeight / 2) {
          setIsFullscreen(false);
          handleCloseWithAnimation();
        } else if (offset > CLOSE_THRESHOLD) {
          setIsFullscreen(false);
        }
      } else if (offset < FULLSCREEN_THRESHOLD) {
        setIsFullscreen(true);
      } else if (offset > CLOSE_THRESHOLD) {
        handleCloseWithAnimation();
      }
    } else {
      // Desktop behavior - only horizontal dragging to close
      if (offset > CLOSE_THRESHOLD) {
        handleCloseWithAnimation();
      }
    }

    setOffset(0);
    setDragging(false);
    setDragStart(null);
  }, [CLOSE_THRESHOLD, FULLSCREEN_THRESHOLD, handleCloseWithAnimation, isDesktop, isFullscreen, offset, dragTargetIsInteractive]);

  const handleReactDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const position = getEventPosition(e);
    const target = e.target as Element;

    handleDragStart(position.x, position.y, target);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleReactDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragTargetIsInteractive) return;

    const position = getEventPosition(e);
    handleDragMove(position.x, position.y);
    e.preventDefault();
  };

  // Global mouse event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragging && !dragTargetIsInteractive) {
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragging) {
        handleDragEnd();
      }
    };

    if (dragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragging, handleDragMove, handleDragEnd, dragTargetIsInteractive]);

  // Add non-passive touch event listeners
  useEffect(() => {
    const modalElement = modalRef.current;
    const contentElement = contentRef.current;
    if (!modalElement || !contentElement) return;

    // Initial check for scroll position
    handleScroll();

    const handleTouchStart = (e: TouchEvent) => {
      if (open) {
        // Check if the touch is on the pill or if we're at the top of the content
        const pillElement = modalElement.querySelector(`.${styles.pill}`);
        const touch = e.touches[0];
        const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);

        // Check if touching an interactive element
        const isInteractive = isInteractiveElement(touchTarget);
        setDragTargetIsInteractive(isInteractive);

        // If touching an interactive element, don't initiate modal dragging
        if (isInteractive && !pillElement?.contains(touchTarget as Node)) {
          return;
        }

        if (pillElement && pillElement.contains(touchTarget as Node)) {
          // Always allow dragging from the pill
          handleDragStart(touch.clientX, touch.clientY, null);
        } else if (isFullscreen && isAtTop) {
          // Allow dragging only if we're at the top of the content
          handleDragStart(touch.clientX, touch.clientY, touchTarget);
        } else if (!isFullscreen) {
          // Always allow dragging when not in fullscreen
          handleDragStart(touch.clientX, touch.clientY, touchTarget);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragStart === null || !dragging) return;

      // Don't move modal if drag started on interactive element
      if (dragTargetIsInteractive) return;

      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);

      // Only prevent default when we actually want to block the scroll
      // - When dragging the pill
      // - When fullscreen and at the top and dragging down
      // - When not fullscreen and dragging vertically (to bring it to fullscreen)
      const pillElement = modalElement.querySelector(`.${styles.pill}`);
      const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      const isPillDrag = pillElement && pillElement.contains(touchTarget as Node);
      const isDraggingDown = touch.clientY > dragStart;
      const isVerticalDrag = Math.abs(touch.clientY - dragStart) > Math.abs(touch.clientX - dragStart);

      // Prevent default for vertical drag events when modal is not in fullscreen mode
      // or when pill is being dragged, or when at top and dragging down in fullscreen
      if (isPillDrag || (isFullscreen && isAtTop && isDraggingDown) || (!isFullscreen && isVerticalDrag)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    modalElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    modalElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Add scroll event listener to the content
    contentElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      modalElement.removeEventListener('touchstart', handleTouchStart);
      modalElement.removeEventListener('touchmove', handleTouchMove);
      modalElement.removeEventListener('touchend', handleTouchEnd);
      contentElement.removeEventListener('scroll', handleScroll);
    };
  }, [open, dragStart, dragging, handleDragStart, handleDragMove, handleDragEnd, isAtTop, isFullscreen, isInteractiveElement, dragTargetIsInteractive]);

  // Escape key handler
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          handleCloseWithAnimation();
        }
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [open, isFullscreen]);

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.overlay} ${open && !isClosing ? styles.open : ''} ${isClosing ? styles.closing : ''} ${className}`}
      onClick={handleCloseWithAnimation}
    >
      <div
        className={`${styles.modal} 
          ${open && !isClosing ? styles.open : ''} 
          ${isClosing ? styles.closing : ''} 
          ${isFullscreen ? styles.fullscreen : ''} 
          ${dragging ? styles.dragging : ''}`}
        style={{
          translate: dragging && !dragTargetIsInteractive
            ? isDesktop
              ? `${offset}px 0`
              : `0 ${offset}px`
            : undefined
        }}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        onMouseDown={handleReactDragStart}
        onMouseMove={dragging ? handleReactDragMove : undefined}
        onMouseUp={handleDragEnd}
      >
        <div
          className={styles.pill}
          onMouseDown={handleReactDragStart}
        />
        <button className={styles.closeButton} onClick={handleCloseWithAnimation}>
          &times;
        </button>        <div
          className={styles.content}
          ref={contentRef}
          onScroll={handleScroll}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;