import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * AnimatedModal - Reusable wrapper for smooth modal animations
 * 
 * Features:
 * - Smooth fade in/out backdrop
 * - Scale + slide up animation for modal content
 * - Handles close animation before unmounting
 * 
 * Usage:
 * <AnimatedModal isOpen={isOpen} onClose={handleClose}>
 *   <div className="bg-white rounded-2xl ...">Modal content</div>
 * </AnimatedModal>
 */
export function AnimatedModal({ isOpen, onClose, children, maxWidth = 'max-w-md' }) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Small delay to ensure DOM is ready before animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        } else {
            setIsAnimating(false);
            // Wait for animation to complete before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // Match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!shouldRender) return null;

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-out ${isAnimating ? 'bg-black/50' : 'bg-black/0'
                }`}
            onClick={handleBackdropClick}
        >
            <div
                className={`${maxWidth} w-full transition-all duration-300 ease-out ${isAnimating
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-4'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

/**
 * useAnimatedModal - Hook for managing animated modal state
 * 
 * Returns:
 * - isOpen: Current open state
 * - open: Function to open modal
 * - close: Function to close modal (with animation)
 */
export function useAnimatedModal(initialState = false) {
    const [isOpen, setIsOpen] = useState(initialState);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    return { isOpen, open, close };
}

/**
 * Simple Modal Overlay styles for inline use
 * Can be applied directly to existing modals
 */
export const modalAnimationStyles = `
    .modal-backdrop {
        transition: background-color 0.3s ease-out;
    }
    .modal-backdrop-visible {
        background-color: rgba(0, 0, 0, 0.5);
    }
    .modal-backdrop-hidden {
        background-color: rgba(0, 0, 0, 0);
    }
    .modal-content {
        transition: all 0.3s ease-out;
    }
    .modal-content-visible {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    .modal-content-hidden {
        opacity: 0;
        transform: scale(0.95) translateY(1rem);
    }
`;

export default AnimatedModal;
