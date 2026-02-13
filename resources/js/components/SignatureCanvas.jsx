import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * Reusable Signature Canvas Modal Component
 * Supports both touch (mobile) and mouse (desktop) drawing.
 * Outputs transparent PNG base64 string.
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when modal is dismissed
 * @param {function} onSave - Called with base64 PNG string when user saves
 * @param {string} title - Optional modal title
 */
export default function SignatureCanvas({ isOpen, onClose, onSave, title = 'Tanda Tangan' }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const lastPoint = useRef(null);

    // Setup canvas on mount/resize
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2.5;
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Small delay so DOM is painted first
            const timer = setTimeout(setupCanvas, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, setupCanvas]);

    // Get point coordinates from event
    const getPoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    // Drawing handlers
    const startDrawing = (e) => {
        e.preventDefault();
        const point = getPoint(e);
        lastPoint.current = point;
        setIsDrawing(true);
        setHasDrawn(true);

        // Draw a dot for single taps
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.25, 0, Math.PI * 2);
        ctx.fill();
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing || !lastPoint.current) return;

        const point = getPoint(e);
        const ctx = canvasRef.current.getContext('2d');

        // Smooth bezier curve between points
        const midX = (lastPoint.current.x + point.x) / 2;
        const midY = (lastPoint.current.y + point.y) / 2;

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
        ctx.stroke();

        lastPoint.current = point;
    };

    const stopDrawing = (e) => {
        if (e) e.preventDefault();
        setIsDrawing(false);
        lastPoint.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get the actual drawn area (trim whitespace)
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;

        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        // Add padding
        const pad = 10 * dpr;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(width, maxX + pad);
        maxY = Math.min(height, maxY + pad);

        const croppedWidth = maxX - minX;
        const croppedHeight = maxY - minY;

        if (croppedWidth <= 0 || croppedHeight <= 0) return;

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = croppedWidth;
        croppedCanvas.height = croppedHeight;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

        const base64 = croppedCanvas.toDataURL('image/png');
        onSave(base64);
        clearCanvas();
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <i className="fas fa-signature text-sm"></i>
                        </div>
                        <h3 className="font-bold text-sm">{title}</h3>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="p-4">
                    <p className="text-xs text-gray-400 mb-2 text-center">
                        <i className="fas fa-pen-fancy mr-1"></i>
                        Tanda tangan di area bawah ini
                    </p>
                    <div
                        className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden"
                        style={{ height: '180px', touchAction: 'none' }}
                    >
                        {/* Guide line */}
                        <div className="absolute bottom-12 left-6 right-6 border-b border-gray-200 pointer-events-none"></div>
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        {!hasDrawn && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-gray-300 text-lg font-light italic">Tanda tangan disini</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-4 pb-4">
                    <button
                        type="button"
                        onClick={clearCanvas}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <i className="fas fa-eraser text-xs"></i> Hapus
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!hasDrawn}
                        className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        <i className="fas fa-check text-xs"></i> Simpan
                    </button>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
