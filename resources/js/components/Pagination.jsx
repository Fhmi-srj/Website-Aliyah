import React from 'react';

/**
 * Reusable Pagination Component
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback function when page changes
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items shown per page
 * @param {function} onLimitChange - Callback function when items per page changes
 */
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage, onLimitChange }) {
    if (totalItems === 0) return null;

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const limits = [10, 20, 50, 100];

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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 px-4 py-4 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Menampilkan <span className="text-gray-700 dark:text-dark-text">{startItem}-{endItem}</span> dari <span className="text-primary">{totalItems}</span> data
                </div>

                {onLimitChange && (
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tampilkan:</span>
                        <div className="relative group">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => onLimitChange(Number(e.target.value))}
                                className="appearance-none bg-white dark:bg-dark-surface pl-4 pr-10 py-2 rounded-xl border border-gray-100 dark:border-dark-border text-[11px] font-black text-primary dark:text-primary tracking-tight cursor-pointer focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all outline-none shadow-sm hover:shadow-md"
                            >
                                {limits.map(limit => (
                                    <option key={limit} value={limit} className="dark:bg-dark-card py-2">
                                        {limit} Baris
                                    </option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 group-hover:text-primary transition-colors pointer-events-none"></i>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 ${currentPage === 1
                        ? 'bg-gray-50 dark:bg-dark-bg text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-dark-text hover:bg-primary hover:text-white dark:hover:bg-primary border border-gray-100 dark:border-dark-border hover:shadow-lg hover:shadow-primary/20'
                        }`}
                    title="Halaman Sebelumnya"
                >
                    <i className="fas fa-chevron-left text-[10px]"></i>
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                        <button
                            key={idx}
                            onClick={() => typeof page === 'number' && onPageChange(page)}
                            disabled={page === '...'}
                            className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-xl text-[11px] font-black transition-all duration-200 ${page === currentPage
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : page === '...'
                                    ? 'text-gray-300 dark:text-gray-600 cursor-default'
                                    : 'bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-bg border border-gray-100 dark:border-dark-border'
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 ${currentPage === totalPages || totalPages === 0
                        ? 'bg-gray-50 dark:bg-dark-bg text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-dark-text hover:bg-primary hover:text-white dark:hover:bg-primary border border-gray-100 dark:border-dark-border hover:shadow-lg hover:shadow-primary/20'
                        }`}
                    title="Halaman Berikutnya"
                >
                    <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </div>
    );
}

export default Pagination;
