import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CrudModal, { ModalSection } from '../../../components/CrudModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useMemo } from 'react';
import { API_BASE, authFetch } from '../../../config/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';
import CbtPreviewModal from '../../../components/CbtPreviewModal';

// Image compression utility strictly enforcing maxSizeKB
const compressImage = (file, maxSizeKB = 100) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_WIDTH = 1000;
                const MAX_HEIGHT = 1000;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Recursively lower quality to meet size requirement
                while (dataUrl.length / 1024 > maxSizeKB && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(dataUrl);
            };
        };
    });
};

export default function AdminCbtSoal() {
    const { id } = useParams(); // params id is the question_bank_id
    const navigate = useNavigate();
    const quillRef = useRef(null);

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                const compressedBase64 = await compressImage(file, 100);
                const editor = quillRef.current.getEditor();
                const range = editor.getSelection() || { index: editor.getLength() };
                editor.insertEmbed(range.index, 'image', compressedBase64);
                editor.setSelection(range.index + 1);
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), []);

    const [bankData, setBankData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    // Upload State (Excel & Word combined)
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState([]);
    const [importType, setImportType] = useState(null); // 'excel' or 'word'
    const [uploading, setUploading] = useState(false);
    const importInputRef = useRef(null);

    const [formData, setFormData] = useState({
        type: 'multiple_choice',
        content: '',
        options: [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' },
            { id: 'E', text: '' }
        ],
        correct_answer: 'A',
        weight: 1
    });

    const fetchBankAndQuestions = async () => {
        try {
            setLoading(true);
            const [bankRes, questionsRes] = await Promise.all([
                authFetch(`${API_BASE}/cbt/question-banks/${id}`),
                authFetch(`${API_BASE}/cbt/question-banks/${id}/questions`)
            ]);
            
            if (bankRes.ok && questionsRes.ok) {
                const bankJson = await bankRes.json();
                const qJson = await questionsRes.json();
                setBankData(bankJson.data);
                setQuestions(qJson.data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal memuat data' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBankAndQuestions();
    }, [id]);

    const openAddModal = () => {
        setModalMode('add');
        setFormData({
            type: 'multiple_choice', content: '',
            options: [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }, { id: 'E', text: '' }],
            correct_answer: 'A', weight: 1
        });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setCurrentItem(item);
        
        let parsedOptions = [];
        if (item.options) {
            try { parsedOptions = typeof item.options === 'string' ? JSON.parse(item.options) : item.options; } 
            catch(e) { parsedOptions = []; }
        }

        let parsedAnswer = item.correct_answer;
        if (parsedAnswer && typeof parsedAnswer === 'string' && (parsedAnswer.startsWith('"') || parsedAnswer.startsWith('['))) {
             try { parsedAnswer = JSON.parse(parsedAnswer); } catch(e){}
        }

        let defaultAnswer = parsedAnswer;
        if (item.type === 'ms_choice' && !Array.isArray(defaultAnswer)) {
            defaultAnswer = typeof defaultAnswer === 'string' ? defaultAnswer.split(',').map(s=>s.trim()) : [];
        } else if (item.type !== 'ms_choice' && item.type !== 'matching') {
            defaultAnswer = parsedAnswer || 'A';
        }

        let defaultOpts = parsedOptions;
        if (defaultOpts.length === 0) {
            if (item.type === 'matching') {
                defaultOpts = [{ id: 1, left: '', right: '' }];
            } else {
                defaultOpts = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }, { id: 'E', text: '' }];
            }
        }

        setFormData({
            type: item.type || 'multiple_choice',
            content: item.content || '',
            options: defaultOpts,
            correct_answer: defaultAnswer,
            weight: item.weight || 1
        });
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const handleOptionChange = (idx, val) => {
        const newOpts = [...formData.options];
        newOpts[idx].text = val;
        setFormData({ ...formData, options: newOpts });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = modalMode === 'add' ? `${API_BASE}/cbt/question-banks/${id}/questions` : `${API_BASE}/cbt/questions/${currentItem.id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';

            // Stringify JSONs before sending to backend to match strict expectations
            const payload = { ...formData };
            if (payload.type === 'true_false') {
                payload.options = [{ id: 'A', text: 'Benar' }, { id: 'B', text: 'Salah' }];
            }
            if (['multiple_choice', 'ms_choice', 'true_false', 'matching'].includes(payload.type)) {
                payload.options = JSON.stringify(payload.options);
                payload.correct_answer = JSON.stringify(payload.correct_answer || '');
            } else {
                payload.options = null;
            }

            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                closeModal();
                fetchBankAndQuestions();
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Soal berhasil ${modalMode === 'add' ? 'ditambahkan' : 'diperbarui'}`, timer: 1500, showConfirmButton: false });
            } else {
                const error = await response.json();
                Swal.fire({ icon: 'error', title: 'Gagal!', text: error.message || 'Terjadi kesalahan' });
            }
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleDelete = async (qId) => {
        const result = await Swal.fire({
            title: 'Hapus Soal?', text: 'Data tidak dapat dikembalikan!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus!'
        });
        if (!result.isConfirmed) return;
        try {
            const response = await authFetch(`${API_BASE}/cbt/questions/${qId}`, { method: 'DELETE' });
            if (response.ok) {
                fetchBankAndQuestions();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Soal berhasil dihapus', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const downloadTemplate = () => {
        const header = [['no', 'type (opsional)', 'content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct_answer', 'weight']];
        const example = [
            [1, '', 'Contoh soal pilihan ganda otomatis terdeteksi', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Pilihan E', 'A', 1],
            [2, '', 'Soal esai otomatis terdeteksi jika tidak ada opsi', '', '', '', '', '', '', 2],
            [3, '', 'Pernyataan ini otomatis terdeteksi Benar/Salah.', 'Benar', 'Salah', '', '', '', 'A', 1],
            [4, '', 'Soal PG kompleks terdeteksi jika jawaban berisi koma', 'Pilihan 1', 'Pilihan 2', 'Pilihan 3', 'Pilihan 4', 'Pilihan 5', 'A,C,D', 1],
            [5, 'multiple_choice', 'Bisa juga isi kolom type manual jika ingin eksplisit', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', '', 'B', 1],
        ];
        const ws = XLSX.utils.aoa_to_sheet([...header, ...example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Soal');
        XLSX.writeFile(wb, 'template_soal_cbt.xlsx');
    };

    // Auto-detect tipe soal dari data baris Excel (sama logic dengan Word parser)
    const autoDetectExcelType = (row) => {
        // Jika sudah ada type yang valid, pakai itu
        const validTypes = ['multiple_choice', 'essay', 'ms_choice', 'true_false', 'matching'];
        if (row.type && validTypes.includes(String(row.type).trim().toLowerCase())) {
            return String(row.type).trim().toLowerCase();
        }

        const optA = String(row.option_a || '').trim().toLowerCase();
        const optB = String(row.option_b || '').trim().toLowerCase();
        const optC = String(row.option_c || '').trim();
        const optD = String(row.option_d || '').trim();
        const optE = String(row.option_e || '').trim();
        const correctAnswer = String(row.correct_answer || '').trim();

        // Tidak ada opsi sama sekali → esai
        if (!optA && !optB && !optC && !optD && !optE) {
            return 'essay';
        }

        // Opsi A=benar & B=salah & tidak ada C,D,E → benar/salah
        if ((optA === 'benar' || optA === 'true') && (optB === 'salah' || optB === 'false') && !optC && !optD && !optE) {
            return 'true_false';
        }

        // Jawaban berisi koma → PG Kompleks
        if (correctAnswer.includes(',')) {
            return 'ms_choice';
        }

        // Default → pilihan ganda biasa
        return 'multiple_choice';
    };

    const handleImportFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            setImportType('excel');
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

                    // Normalisasi header: hapus teks tambahan seperti " (opsional)"
                    const normalized = raw.map(row => {
                        const cleanRow = {};
                        for (const key of Object.keys(row)) {
                            const cleanKey = key.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
                            cleanRow[cleanKey] = row[key];
                        }
                        // Auto-detect tipe soal jika kolom 'type' kosong atau tidak valid
                        cleanRow.type = autoDetectExcelType(cleanRow);
                        return cleanRow;
                    });

                    setImportData(normalized);
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal membaca file Excel. Pastikan format sesuai.' });
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.name.endsWith('.docx')) {
            setImportType('word');
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                const text = result.value; 
                
                const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
                const parsedQuestions = [];
                let currentQ = null;

                let nextIsQuestion = false;
                let nextIsOption = null;

                const qLineRegex = /^(?:Q:)?(\d+)[\.\)]\s+(.*)/i;
                const qTagRegex = /^(?:Q:)?(\d+)[\.\)]$/i;
                const optLineRegex = /^([a-e])[:\.\)]+\s+(.*)/i;
                const optTagRegex = /^([a-e])[:\.\)]+$/i;
                const keyRegex = /^kunci(?:\s+jawaban)?\s*:\s*(.*)/i;
                const bobotRegex = /^bobot\s*:\s*(\d+(?:\.\d+)?)/i;

                for (const line of lines) {
                    if (nextIsQuestion) {
                        if (currentQ) parsedQuestions.push(currentQ);
                        currentQ = {
                            type: 'multiple_choice', 
                            content: line,
                            option_a: '', option_b: '', option_c: '', option_d: '', option_e: '',
                            correct_answer: '',
                            weight: 1
                        };
                        nextIsQuestion = false;
                        continue;
                    }

                    if (nextIsOption) {
                        currentQ[`option_${nextIsOption}`] = line;
                        nextIsOption = null;
                        continue;
                    }

                    const qMatch = line.match(qLineRegex);
                    if (qMatch) {
                        if (currentQ) parsedQuestions.push(currentQ);
                        currentQ = {
                            type: 'multiple_choice', 
                            content: qMatch[2],
                            option_a: '', option_b: '', option_c: '', option_d: '', option_e: '',
                            correct_answer: '',
                            weight: 1
                        };
                        continue;
                    }

                    const qTagMatch = line.match(qTagRegex);
                    if (qTagMatch) {
                        nextIsQuestion = true;
                        continue;
                    }

                    if (!currentQ) continue; 

                    const oMatch = line.match(optLineRegex);
                    if (oMatch) {
                        const letter = oMatch[1].toLowerCase();
                        if (['a','b','c','d','e'].includes(letter)) {
                            currentQ[`option_${letter}`] += (currentQ[`option_${letter}`] ? '<br/>' : '') + oMatch[2];
                        }
                        continue;
                    }

                    const oTagMatch = line.match(optTagRegex);
                    if (oTagMatch) {
                        const letter = oTagMatch[1].toLowerCase();
                        if (['a','b','c','d','e'].includes(letter)) {
                            nextIsOption = letter;
                        }
                        continue;
                    }

                    const kMatch = line.match(keyRegex);
                    if (kMatch) {
                        currentQ.correct_answer = kMatch[1].toUpperCase().replace(/\s+/g, '');
                        continue;
                    }

                    const bMatch = line.match(bobotRegex);
                    if (bMatch) {
                        currentQ.weight = parseFloat(bMatch[1]) || 1;
                        continue;
                    }

                    if (!currentQ.option_a && !currentQ.correct_answer) {
                        currentQ.content += '<br/>' + line;
                    } else if (!currentQ.correct_answer) {
                        const opts = ['e','d','c','b','a'];
                        for(let o of opts) {
                            if (currentQ[`option_${o}`]) {
                                currentQ[`option_${o}`] += '<br/>' + line;
                                break;
                            }
                        }
                    }
                }
                if (currentQ) parsedQuestions.push(currentQ);

                const finalQuestions = parsedQuestions.map(q => {
                    const hasA = q.option_a.toLowerCase() === 'benar';
                    const hasB = q.option_b.toLowerCase() === 'salah';
                    if (hasA && hasB && !q.option_c && !q.option_d && !q.option_e) {
                        q.type = 'true_false';
                        q.correct_answer = q.correct_answer.charAt(0) || 'A';
                        return q;
                    }
                    if (!q.option_a && !q.option_b && !q.option_c && !q.option_d && !q.option_e) {
                        q.type = 'essay';
                        return q;
                    }
                    if (q.correct_answer.includes(',')) {
                        q.type = 'ms_choice';
                        return q;
                    }
                    q.correct_answer = q.correct_answer.charAt(0) || 'A';
                    return q;
                }).filter(q => q.content);

                setImportData(finalQuestions);
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal membaca dokumen Word. Pastikan format file .docx' });
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Format file tidak didukung.' });
        }
    };

    const handleImportUpload = async () => {
        if (importData.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Kosong', text: 'Belum ada data unggahan yang terbaca.' });
            return;
        }
        setUploading(true);
        try {
            const questions = importData.map(row => ({
                type: row.type || 'multiple_choice',
                content: String(row.content || ''),
                option_a: String(row.option_a || ''),
                option_b: String(row.option_b || ''),
                option_c: String(row.option_c || ''),
                option_d: String(row.option_d || ''),
                option_e: String(row.option_e || ''),
                correct_answer: String(row.correct_answer || 'A'),
                weight: Number(row.weight) || 1,
            }));

            const response = await authFetch(`${API_BASE}/cbt/question-banks/${id}/questions/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ questions }),
            });
            const result = await response.json();
            
            if (response.ok && !result.errors?.length) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message || 'Soal berhasil diimpor.', timer: 2000, showConfirmButton: false });
                setShowImportModal(false);
                setImportData([]);
                fetchBankAndQuestions();
            } else {
                Swal.fire({ icon: 'warning', title: result.message || "Gagal", html: result.errors?.map(e => `<div>${e}</div>`).join('') });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mengunggah soal.' });
        } finally {
            setUploading(false);
        }
    };

    if (loading && !bankData) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn flex flex-col flex-grow max-w-full overflow-auto">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/cbt/bank-soal')} className="w-10 h-10 rounded-xl flex-shrink-0 bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary flex items-center justify-center transition-all shadow-sm">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight truncate">Kelola Soal: {bankData?.name}</h1>
                        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-widest truncate">
                            {bankData?.mapel?.nama_mapel} - {questions.length} Soal
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setShowPreview(true)} className="btn-primary !bg-blue-500 hover:!bg-blue-600 flex-1 justify-center md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 font-black uppercase tracking-widest text-[10px] md:text-[11px]">
                        <i className="fas fa-eye"></i> Preview
                    </button>
                    <button onClick={() => { setShowImportModal(true); setImportData([]); }} className="btn-primary !bg-purple-600 hover:!bg-purple-700 flex-1 justify-center md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 font-black uppercase tracking-widest text-[10px] md:text-[11px]">
                        <i className="fas fa-upload"></i> Upload Soal
                    </button>
                    <button onClick={openAddModal} className="btn-primary flex-1 justify-center md:flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] md:text-[11px]">
                        <i className="fas fa-plus"></i> Soal
                    </button>
                </div>
            </header>

            <div className="space-y-4 pb-8">
                {questions.map((q, idx) => {
                    let opts = [];
                    try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []); } catch(e){}
                    
                    // Robust normalization for correct_answer (handles all backend formats)
                    let ans;
                    try {
                        const raw = q.correct_answer;
                        if (raw === null || raw === undefined) {
                            ans = null;
                        } else if (Array.isArray(raw)) {
                            ans = raw.map(a => String(a).toUpperCase());
                        } else if (typeof raw === 'string') {
                            const trimmed = raw.trim();
                            if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
                                const parsed = JSON.parse(trimmed);
                                ans = Array.isArray(parsed) ? parsed.map(a => String(a).toUpperCase()) : String(parsed).toUpperCase();
                            } else {
                                ans = trimmed.toUpperCase();
                            }
                        } else {
                            ans = raw;
                        }
                    } catch(e) { ans = q.correct_answer; }

                    return (
                        <div key={q.id} className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 relative group">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(q)} className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100"><i className="fas fa-edit"></i></button>
                                <button onClick={() => handleDelete(q.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"><i className="fas fa-trash"></i></button>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest">{q.type.replace('_', ' ')}</span>
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-widest">Bobot: {q.weight}</span>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-gray-800 font-medium mb-4 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: q.content }}></div>
                                    
                                    {['multiple_choice', 'ms_choice'].includes(q.type) && opts.length > 0 && (
                                        <div className="space-y-2 mt-4">
                                            {opts.map(opt => {
                                                const optId = String(opt.id).toUpperCase();
                                                const isCorrect = Array.isArray(ans) ? ans.includes(optId) : ans === optId;
                                                return (
                                                    <div key={opt.id} className={`p-3 rounded-xl border flex gap-3 items-center ${isCorrect ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                            {opt.id}
                                                        </div>
                                                        <div className="text-sm text-gray-700">{opt.text}</div>
                                                        {isCorrect && <i className="fas fa-check text-green-500 ml-auto mr-2"></i>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {q.type === 'true_false' && (
                                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 text-sm font-bold flex items-center gap-2">
                                            <i className="fas fa-info-circle"></i> Jawaban Benar: {ans === 'A' ? 'PERNYATAAN BENAR' : 'PERNYATAAN SALAH'}
                                        </div>
                                    )}
                                    {q.type === 'matching' && opts.length > 0 && (
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="text-[10px] items-center font-bold text-gray-400 uppercase">Pernyataan Kiri</div>
                                                {opts.map((opt, i) => <div key={'l'+i} className="p-2 bg-gray-50 border rounded-lg text-xs truncate" title={opt.left}>{opt.left}</div>)}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-[10px] items-center font-bold text-gray-400 uppercase">Pasangan Kanan</div>
                                                {opts.map((opt, i) => <div key={'r'+i} className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs truncate" title={opt.right}>{opt.right}</div>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {questions.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <i className="fas fa-file-alt text-4xl text-gray-300 mb-3"></i>
                        <p className="text-gray-500 font-bold">Belum ada soal.</p>
                        <p className="text-xs text-gray-400 mt-1">Silakan tambah soal baru untuk bank ini.</p>
                    </div>
                )}
            </div>

            <CrudModal show={showModal} onClose={closeModal} title={modalMode === 'add' ? 'Tambah Soal' : 'Edit Soal'} icon={modalMode === 'add' ? 'plus' : 'edit'} onSubmit={handleSubmit} submitLabel={modalMode === 'add' ? 'Simpan Soal' : 'Perbarui'} maxWidth="max-w-4xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 border border-gray-100 bg-gray-50 p-3 rounded-xl">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipe Soal *</label>
                            <select value={formData.type} onChange={(e) => {
                                const newType = e.target.value;
                                let newOpts = formData.options;
                                let newAns = formData.correct_answer;
                                if (newType === 'matching') {
                                    newOpts = [{ id: 1, left: '', right: '' }];
                                    newAns = null;
                                } else if (newType === 'ms_choice') {
                                    newOpts = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }, { id: 'E', text: '' }];
                                    newAns = [];
                                } else if (newType === 'true_false') {
                                    newAns = 'A';
                                } else if (newType === 'multiple_choice') {
                                    newOpts = [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }, { id: 'E', text: '' }];
                                    newAns = 'A';
                                }
                                setFormData({ ...formData, type: newType, options: newOpts, correct_answer: newAns });
                            }} className="input-standard">
                                <option value="multiple_choice">Pilihan Ganda</option>
                                <option value="ms_choice">PG Kompleks (Banyak Jawaban)</option>
                                <option value="true_false">Benar / Salah</option>
                                <option value="matching">Menjodohkan</option>
                                <option value="essay">Esai</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 border border-gray-100 bg-gray-50 p-3 rounded-xl">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bobot Nilai *</label>
                            <input type="number" min="1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })} className="input-standard" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Isi Pertanyaan *</label>
                        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                            <ReactQuill 
                                ref={quillRef}
                                theme="snow"
                                value={formData.content}
                                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                                modules={modules}
                                placeholder="Ketik soal di sini... (Gambar bisa disisipkan dan format lengkap)"
                                style={{ height: '220px', marginBottom: '45px' }}
                            />
                        </div>
                    </div>

                    {['multiple_choice', 'ms_choice', 'true_false'].includes(formData.type) && (
                        <div>
                            <ModalSection label="Pilihan Jawaban" />
                            {formData.type === 'true_false' ? (
                                <div className="space-y-3 mt-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 font-black flex items-center justify-center border border-green-200">A</div>
                                        <div className="flex-1 font-bold text-gray-700">Pernyataan Benar</div>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-gray-200 hover:border-green-400 group">
                                            <input type="radio" checked={formData.correct_answer === 'A'} onChange={() => setFormData({...formData, correct_answer: 'A'})} className="w-4 h-4 text-green-600" /> <span className="text-xs font-bold text-gray-500 group-hover:text-green-600">Kunci Utama</span>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-black flex items-center justify-center border border-red-200">B</div>
                                        <div className="flex-1 font-bold text-gray-700">Pernyataan Salah</div>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-gray-200 hover:border-red-400 group">
                                            <input type="radio" checked={formData.correct_answer === 'B'} onChange={() => setFormData({...formData, correct_answer: 'B'})} className="w-4 h-4 text-red-600" /> <span className="text-xs font-bold text-gray-500 group-hover:text-red-600">Kunci Utama</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-blue-500 mt-2"><i className="fas fa-info-circle"></i> Siswa akan dihadapkan pada dua tombol besar (Benar atau Salah).</p>
                                </div>
                            ) : (
                                <div className="space-y-3 mt-3">
                                    {formData.options.map((opt, idx) => {
                                        const isChecked = formData.type === 'ms_choice' 
                                            ? (Array.isArray(formData.correct_answer) && formData.correct_answer.includes(opt.id))
                                            : (formData.correct_answer === opt.id);
                                        return (
                                            <div key={opt.id} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex flex-shrink-0 items-center justify-center font-black text-gray-600">
                                                    {opt.id}
                                                </div>
                                                <input type="text" value={opt.text || ''} onChange={(e) => handleOptionChange(idx, e.target.value)} required={idx < 2} className="input-standard flex-1" placeholder={`Teks Pilihan ${opt.id} ${idx > 1 ? '(Opsional)' : ''}`} />
                                                <label className="flex items-center gap-2 ml-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 hover:bg-emerald-50 group transition-colors">
                                                    <input 
                                                        type={formData.type === 'ms_choice' ? "checkbox" : "radio"} 
                                                        checked={isChecked} 
                                                        onChange={(e) => {
                                                            if (formData.type === 'ms_choice') {
                                                                let curr = Array.isArray(formData.correct_answer) ? [...formData.correct_answer] : [];
                                                                if (e.target.checked) curr.push(opt.id);
                                                                else curr = curr.filter(x => x !== opt.id);
                                                                setFormData({ ...formData, correct_answer: curr });
                                                            } else {
                                                                setFormData({ ...formData, correct_answer: opt.id });
                                                            }
                                                        }} 
                                                        className="w-4 h-4 text-emerald-600 cursor-pointer" 
                                                    />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-emerald-700">Kunci</span>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {formData.type === 'matching' && (
                        <div>
                            <ModalSection label="Pasangan Item" />
                            <div className="space-y-3 mt-3">
                                {formData.options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                        <div className="flex-1 space-y-2">
                                            <input type="text" value={opt.left || ''} onChange={(e) => {
                                                const newOpts = [...formData.options];
                                                newOpts[idx].left = e.target.value;
                                                setFormData({ ...formData, options: newOpts });
                                            }} placeholder="Pernyataan Sebelah Kiri" className="input-standard bg-white !py-2 text-sm" required />
                                            <input type="text" value={opt.right || ''} onChange={(e) => {
                                                const newOpts = [...formData.options];
                                                newOpts[idx].right = e.target.value;
                                                setFormData({ ...formData, options: newOpts });
                                            }} placeholder="Pasangan Sebelah Kanan (Kunci)" className="input-standard bg-white border-emerald-200 !py-2 text-sm" required />
                                        </div>
                                        <button type="button" onClick={() => {
                                            const newOpts = formData.options.filter((_, i) => i !== idx);
                                            if(newOpts.length === 0) newOpts.push({id:1, left: '', right: ''});
                                            setFormData({ ...formData, options: newOpts });
                                        }} className="w-10 h-20 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all border border-red-100">
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => {
                                    setFormData({ ...formData, options: [...formData.options, { id: formData.options.length + 1, left: '', right: '' }] });
                                }} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors text-sm font-bold">
                                    <i className="fas fa-plus mr-2"></i> Tambah Baris Pasangan
                                </button>
                                <p className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100 mt-2">
                                    <i className="fas fa-magic"></i> Saat ujian, posisi Pasangan Kanan akan diacak oleh sistem. Siswa harus menjodohkan Kiri ke Kanan yang tepat.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CrudModal>

            {/* Smart Import Modal */}
            <CrudModal 
                show={showImportModal} 
                onClose={() => setShowImportModal(false)} 
                title="Smart Import Soal" 
                subtitle="Unggah sekaligus via Excel (.xlsx) atau Word (.docx)" 
                icon="upload" 
                onSubmit={handleImportUpload} 
                submitLabel={uploading ? "Mengunggah..." : `Simpan ${importData.length} Soal`} 
                maxWidth="max-w-xl"
            >
                <div className="space-y-5">
                    
                    {/* Template Guides & Downloads */}
                    <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i className="fas fa-info-circle text-blue-500"></i> Panduan & Download Template
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <button type="button" onClick={downloadTemplate} className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-colors group">
                                <i className="fas fa-file-excel text-2xl text-emerald-500 group-hover:scale-110 transition-transform mb-2"></i>
                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Download Template Excel</span>
                            </button>
                            <a href="/templates/template_soal_word.docx" download="Template_Soal_Word.docx" className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-colors group cursor-pointer">
                                <i className="fas fa-file-word text-2xl text-indigo-500 group-hover:scale-110 transition-transform mb-2"></i>
                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest text-center">Download Template Word</span>
                            </a>
                        </div>
                    </div>

                    {/* Upload Zone */}
                    <div className={`border-2 border-dashed ${importData.length > 0 ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'} rounded-2xl p-8 text-center cursor-pointer transition-all duration-200`} onClick={() => importInputRef.current?.click()}>
                        <div className="flex justify-center gap-3 mb-4">
                            <i className="fas fa-file-excel text-4xl text-emerald-400"></i>
                            <i className="fas fa-file-word text-4xl text-indigo-400"></i>
                        </div>
                        <h4 className="text-sm font-bold text-gray-700 mb-1">Pilih File Soal (.xlsx atau .docx)</h4>
                        <p className="text-xs text-gray-500">Klik area ini untuk memilih file yang akan diimport</p>
                        
                        {importData.length > 0 && (
                            <div className="mt-4 bg-green-100 text-green-700 text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-2">
                                <i className="fas fa-check-circle"></i> {importData.length} Soal Siap Diunggah ({importType?.toUpperCase()})
                            </div>
                        )}
                        <input ref={importInputRef} type="file" accept=".xlsx, .xls, .docx" className="hidden" onChange={handleImportFileChange} />
                    </div>

                    {/* Validated Preview Table */}
                    {importData.length > 0 && (
                        <div className="max-h-56 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-inner">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 text-center">No</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Isi (Preview)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {importData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 font-bold text-center">{i + 1}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${row.type === 'essay' ? 'bg-amber-100 text-amber-700' : row.type === 'ms_choice' ? 'bg-purple-100 text-purple-700' : row.type === 'true_false' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}`}>{row.type?.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px] truncate" title={row.content}>{String(row.content).replace(/<[^>]+>/g, ' ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </CrudModal>

            <CbtPreviewModal 
                show={showPreview} 
                onClose={() => setShowPreview(false)} 
                questions={questions} 
            />
        </div>
    );
}
