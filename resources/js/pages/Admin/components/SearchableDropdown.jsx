import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';

/**
 * Reusable Searchable Dropdown with inline "Add New", Edit, and Delete functionality.
 *
 * Props:
 *  - options: Array of { id, nama }
 *  - value: selected id
 *  - onChange: (id) => void
 *  - onAddNew: (nama) => Promise<{ id, nama }> — called when user clicks "+ Tambah"
 *  - onEdit: (id, newNama) => Promise<void> — called when user edits an item
 *  - onDelete: (id) => Promise<void> — called when user deletes an item
 *  - placeholder: string
 *  - label: string
 *  - disabled: boolean
 */
function SearchableDropdown({ options = [], value, onChange, onAddNew, onEdit, onDelete, placeholder = 'Pilih...', label, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selectedOption = options.find(o => o.id === value);

    // Filter options based on search
    const filtered = options.filter(o =>
        o.nama.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = options.some(o =>
        o.nama.toLowerCase() === search.toLowerCase()
    );

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSelect = (option) => {
        onChange(option.id);
        setIsOpen(false);
        setSearch('');
    };

    const handleAddNew = async () => {
        if (!search.trim() || !onAddNew) return;
        setAdding(true);
        try {
            const newItem = await onAddNew(search.trim());
            if (newItem) {
                onChange(newItem.id);
            }
        } catch (err) {
            console.error('Failed to add new item:', err);
        } finally {
            setAdding(false);
            setIsOpen(false);
            setSearch('');
        }
    };

    const handleEdit = async (e, option) => {
        e.stopPropagation();
        if (!onEdit) return;
        const { value: newNama, isConfirmed } = await Swal.fire({
            title: 'Edit Nama',
            input: 'text',
            inputValue: option.nama,
            inputPlaceholder: 'Masukkan nama baru...',
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            inputValidator: (v) => { if (!v?.trim()) return 'Nama tidak boleh kosong'; }
        });
        if (isConfirmed && newNama?.trim()) {
            try {
                await onEdit(option.id, newNama.trim());
            } catch (err) {
                console.error('Failed to edit item:', err);
            }
        }
    };

    const handleDelete = async (e, option) => {
        e.stopPropagation();
        if (!onDelete) return;
        const confirm = await Swal.fire({
            title: `Hapus "${option.nama}"?`,
            text: 'Item ini akan dihapus dari daftar',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
        });
        if (confirm.isConfirmed) {
            try {
                await onDelete(option.id);
                if (value === option.id) onChange('');
            } catch (err) {
                console.error('Failed to delete item:', err);
            }
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}
            {/* Selected display / trigger */}
            <div
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        setTimeout(() => inputRef.current?.focus(), 50);
                    }
                }}
                className={`
                    w-full px-3 py-2.5 border rounded-lg flex items-center justify-between cursor-pointer
                    transition-all duration-200
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-green-400'}
                    ${isOpen ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'}
                `}
            >
                <span className={`text-sm ${selectedOption ? 'text-gray-800' : 'text-gray-400'}`}>
                    {selectedOption ? selectedOption.nama : placeholder}
                </span>
                <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Ketik untuk mencari..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-transparent outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !exactMatch && search.trim() && onAddNew) {
                                        e.preventDefault();
                                        handleAddNew();
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.length > 0 ? (
                            filtered.map(option => (
                                <div
                                    key={option.id}
                                    className={`
                                        w-full text-left px-4 py-2.5 text-sm transition-colors duration-150
                                        flex items-center gap-2 group cursor-pointer
                                        ${option.id === value
                                            ? 'bg-green-50 text-green-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }
                                    `}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.id === value && <i className="fas fa-check text-green-500 text-xs"></i>}
                                    <span className="flex-1">{option.nama}</span>
                                    {/* Edit & Delete buttons */}
                                    <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                        {onEdit && (
                                            <button onClick={(e) => handleEdit(e, option)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-orange-100 text-gray-400 hover:text-orange-500 transition-colors" title="Edit">
                                                <i className="fas fa-pen text-[9px]"></i>
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button onClick={(e) => handleDelete(e, option)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-rose-100 text-gray-400 hover:text-rose-500 transition-colors" title="Hapus">
                                                <i className="fas fa-trash text-[9px]"></i>
                                            </button>
                                        )}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                <i className="fas fa-inbox mr-1"></i> Tidak ditemukan
                            </div>
                        )}
                    </div>

                    {/* Add new button */}
                    {search.trim() && !exactMatch && onAddNew && (
                        <div className="border-t border-gray-100 p-2">
                            <button
                                onClick={handleAddNew}
                                disabled={adding}
                                className="w-full px-4 py-2.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-150 flex items-center gap-2 font-medium disabled:opacity-50"
                            >
                                {adding ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Menambahkan...</>
                                ) : (
                                    <><i className="fas fa-plus-circle"></i> Tambah "{search.trim()}"</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchableDropdown;
