import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * Reusable CRUD Modal component with consistent styling and smooth animations.
 *
 * Props:
 * - show: boolean — whether the modal is visible
 * - onClose: () => void — callback to close the modal
 * - title: string — modal header title
 * - subtitle: string — modal header subtitle (optional)
 * - icon: string — FontAwesome icon class suffix (e.g. "plus", "edit", "user-edit")
 * - onSubmit: (e) => void — form submit handler
 * - submitLabel: string — submit button text (default: "Simpan")
 * - cancelLabel: string — cancel button text (default: "Batal")
 * - maxWidth: string — max-width class (default: "max-w-2xl")
 * - children: ReactNode — form body content
 * - hideFooter: boolean — hide footer buttons (default: false)
 * - isMobile: boolean — mobile responsive mode (optional)
 */
function CrudModal({
    show,
    onClose,
    title,
    subtitle = '',
    icon = 'edit',
    onSubmit,
    submitLabel = 'Simpan',
    cancelLabel = 'Batal',
    maxWidth = 'max-w-2xl',
    children,
    hideFooter = false,
    isMobile = false,
}) {
    const [isClosing, setIsClosing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsClosing(false);
            // Small delay to trigger enter animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
        }
    }, [show]);

    const handleClose = () => {
        setIsClosing(true);
        setIsVisible(false);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(e);
    };

    if (!show && !isClosing) return null;

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 backdrop-blur-sm
                ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            onClick={handleClose}
        >
            <div
                className={`bg-white dark:bg-dark-surface rounded-3xl shadow-2xl ${maxWidth} w-full flex flex-col relative overflow-hidden
                    transform transition-all duration-300
                    ${isVisible && !isClosing
                        ? 'scale-100 translate-y-0 opacity-100'
                        : 'scale-95 translate-y-4 opacity-0'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={`bg-gradient-to-r from-primary to-green-600 ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} text-white relative`}>
                    <button
                        onClick={handleClose}
                        className={`absolute ${isMobile ? 'top-2 right-2 w-6 h-6' : 'top-4 right-4 w-8 h-8'} text-white/80 hover:text-white cursor-pointer transition flex items-center justify-center rounded-full hover:bg-white/20`}
                        type="button"
                        aria-label="Tutup Modal"
                    >
                        <i className={`fas fa-times ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md`}>
                            <i className={`fas fa-${icon} ${isMobile ? 'text-sm' : 'text-lg'}`}></i>
                        </div>
                        <div>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold`}>{title}</h2>
                            {subtitle && (
                                <p className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-white/80 mt-0.5 italic`}>{subtitle}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide max-h-[70vh]">
                        {children}
                    </div>

                    {/* Modal Footer */}
                    {!hideFooter && (
                        <div className={`${isMobile ? 'p-3' : 'p-6'} border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 bg-gray-50/50 dark:bg-dark-bg/20`}>
                            <button
                                type="button"
                                onClick={handleClose}
                                className={`flex-1 ${isMobile ? 'py-2 text-[10px]' : 'py-3 text-xs'} rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-dark-surface transition-all font-black uppercase tracking-widest`}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary flex-1 ${isMobile ? 'py-2 text-[10px]' : 'py-3 text-xs'} rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest`}
                            >
                                {submitLabel}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>,
        document.body
    );
}

/**
 * Section divider for use inside CrudModal body.
 * Creates a colored bar + uppercase label like the Guru modal sections.
 *
 * Props:
 * - label: string
 * - color: string (default: "bg-primary")
 * - isMobile: boolean
 */
export function ModalSection({ label, color = 'bg-primary', isMobile = false }) {
    return (
        <div className={`flex items-center gap-2 ${isMobile ? 'mb-2' : 'mb-4'}`}>
            <div className={`w-1.5 h-4 ${color} rounded-full`}></div>
            <h3 className={`block ${isMobile ? 'text-[10px]' : 'text-xs'} font-black text-gray-400 uppercase tracking-widest`}>{label}</h3>
        </div>
    );
}

/**
 * Standard input field styling class string for use inside CrudModal.
 */
export const modalInputClass = 'w-full bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-dark-text placeholder-gray-400';

/**
 * Standard label styling class string for use inside CrudModal.
 */
export const modalLabelClass = 'block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

export default CrudModal;
