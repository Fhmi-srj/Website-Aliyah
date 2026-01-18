import React from 'react';

/**
 * Reusable Pagination Component
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback function when page changes
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items shown per page
 */
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-2">
            <div className="text-xs text-gray-500">
                Menampilkan {startItem}-{endItem} dari {totalItems} data
            </div>
            <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 text-xs rounded border ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-green-50 hover:border-green-400 cursor-pointer'
                        }`}
                >
                    <i className="fas fa-chevron-left"></i>
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map((page, idx) => (
                    <button
                        key={idx}
                        onClick={() => typeof page === 'number' && onPageChange(page)}
                        disabled={page === '...'}
                        className={`px-3 py-1 text-xs rounded border ${page === currentPage
                                ? 'bg-green-600 text-white border-green-600'
                                : page === '...'
                                    ? 'bg-white text-gray-400 cursor-default border-transparent'
                                    : 'bg-white text-gray-700 hover:bg-green-50 hover:border-green-400 cursor-pointer'
                            }`}
                    >
                        {page}
                    </button>
                ))}

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1 text-xs rounded border ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-green-50 hover:border-green-400 cursor-pointer'
                        }`}
                >
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    );
}

export default Pagination;
