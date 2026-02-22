import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function fmtTime(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function toDatetimeLocal(date, time) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T${time || '00:00'}`;
}
function sameDay(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function inRange(d, s, e) {
    if (!s || !e) return false;
    const t = d.getTime();
    return t >= s.getTime() && t <= e.getTime();
}
function parseDt(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, requireTime = true, label = 'Penjadwalan' }) {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef(null);
    const triggerRef = useRef(null);

    // Parse initial props once
    const initStart = parseDt(startDate);
    const initEnd = parseDt(endDate);

    const [viewYear, setViewYear] = useState(() => (initStart ? initStart.getFullYear() : new Date().getFullYear()));
    const [viewMonth, setViewMonth] = useState(() => (initStart ? initStart.getMonth() : new Date().getMonth()));
    const [selectionPhase, setSelectionPhase] = useState(() => (initStart ? (initEnd ? 'complete' : 'start-selected') : 'idle'));
    const [intStart, setIntStart] = useState(() => initStart ? stripTime(initStart) : null);
    const [intEnd, setIntEnd] = useState(() => initEnd ? stripTime(initEnd) : null);
    const [startTime, setStartTime] = useState(() => initStart ? fmtTime(initStart) : '08:00');
    const [endTime, setEndTime] = useState(() => initEnd ? fmtTime(initEnd) : '08:00');
    const [hoverDate, setHoverDate] = useState(null);

    // Track the prop values we know about to detect truly external changes (e.g. edit modal opening)
    const knownProps = useRef({ s: startDate || '', e: endDate || '' });

    // Detect external prop changes (e.g. parent opens edit modal with different item)
    // This is the ONLY place we sync from props → internal state
    useEffect(() => {
        const prevS = knownProps.current.s;
        const prevE = knownProps.current.e;
        knownProps.current = { s: startDate || '', e: endDate || '' };

        // If nothing changed, skip
        if ((startDate || '') === prevS && (endDate || '') === prevE) return;

        const sp = parseDt(startDate);
        const ep = parseDt(endDate);

        // Only sync if the DATE actually differs (not just time formatting differences from our own emit)
        const startChanged = sp ? (!intStart || !sameDay(sp, intStart)) : !!intStart;
        const endChanged = ep ? (!intEnd || !sameDay(ep, intEnd)) : !!intEnd;

        if (!startChanged && !endChanged) return;

        // Truly external change → update internal state without emitting back
        if (sp) {
            setIntStart(stripTime(sp));
            setStartTime(fmtTime(sp));
            if (sp && !ep) setSelectionPhase('start-selected');
        } else {
            setIntStart(null);
        }
        if (ep) {
            setIntEnd(stripTime(ep));
            setEndTime(fmtTime(ep));
        } else {
            setIntEnd(null);
        }
        if (sp && ep) setSelectionPhase('complete');
        else if (!sp && !ep) setSelectionPhase('idle');
    }, [startDate, endDate]);

    // Close popup on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Direct callbacks — no useEffect loops!
    const emitStart = useCallback((date, time) => {
        const val = toDatetimeLocal(date, time);
        knownProps.current.s = val;
        onStartChange(val);
    }, [onStartChange]);

    const emitEnd = useCallback((date, time) => {
        const val = toDatetimeLocal(date, time);
        knownProps.current.e = val;
        onEndChange(val);
    }, [onEndChange]);

    const handleDayClick = (date) => {
        if (selectionPhase === 'idle' || selectionPhase === 'complete') {
            setIntStart(date);
            setIntEnd(null);
            setSelectionPhase('start-selected');
            emitStart(date, startTime);
            knownProps.current.e = '';
            onEndChange('');
        } else if (selectionPhase === 'start-selected') {
            let s = intStart, e = date;
            if (date < intStart) { s = date; e = intStart; }
            setIntStart(s);
            setIntEnd(e);
            setSelectionPhase('complete');
            setHoverDate(null);
            emitStart(s, startTime);
            emitEnd(e, endTime);
        }
    };

    const handleDayHover = (date) => {
        if (selectionPhase === 'start-selected') setHoverDate(date);
    };

    const handleStartTimeChange = (t) => {
        setStartTime(t);
        if (intStart) emitStart(intStart, t);
    };
    const handleEndTimeChange = (t) => {
        setEndTime(t);
        if (intEnd) emitEnd(intEnd, t);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setIntStart(null);
        setIntEnd(null);
        setSelectionPhase('idle');
        setHoverDate(null);
        knownProps.current = { s: '', e: '' };
        onStartChange('');
        onEndChange('');
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
        else setViewMonth(viewMonth - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
        else setViewMonth(viewMonth + 1);
    };

    const previewStart = selectionPhase === 'start-selected' && hoverDate
        ? (hoverDate < intStart ? hoverDate : intStart) : intStart;
    const previewEnd = selectionPhase === 'start-selected' && hoverDate
        ? (hoverDate < intStart ? intStart : hoverDate) : intEnd;

    const today = stripTime(new Date());
    const formatDisplayDate = (d) => {
        if (!d) return '—';
        return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
    };

    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
        const cells = [];
        for (let i = firstDay - 1; i >= 0; i--)
            cells.push({ day: daysInPrevMonth - i, inMonth: false, date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i) });
        for (let d = 1; d <= daysInMonth; d++)
            cells.push({ day: d, inMonth: true, date: new Date(viewYear, viewMonth, d) });
        const rem = 42 - cells.length;
        for (let d = 1; d <= rem; d++)
            cells.push({ day: d, inMonth: false, date: new Date(viewYear, viewMonth + 1, d) });
        return cells;
    }, [viewYear, viewMonth]);

    const hasSelection = intStart || intEnd;

    return (
        <div>
            <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
            <div className="relative" ref={triggerRef}>
                {/* Trigger */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-surface border rounded-xl transition-all text-left group ${isOpen ? 'border-primary ring-4 ring-primary/10 shadow-lg shadow-primary/5' : 'border-gray-200 dark:border-dark-border hover:border-primary/40 hover:shadow-sm'}`}
                >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${hasSelection ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-dark-bg text-gray-400'}`}>
                        <i className="fas fa-calendar-alt text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        {hasSelection ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                                <span className="text-primary">{formatDisplayDate(intStart)}</span>
                                {requireTime && <span className="text-[10px] text-gray-400 font-medium normal-case">{startTime}</span>}
                                {(intEnd && !sameDay(intStart, intEnd)) && (
                                    <>
                                        <i className="fas fa-arrow-right text-[8px] text-gray-300"></i>
                                        <span className="text-primary">{formatDisplayDate(intEnd)}</span>
                                        {requireTime && <span className="text-[10px] text-gray-400 font-medium normal-case">{endTime}</span>}
                                    </>
                                )}
                                {intStart && intEnd && sameDay(intStart, intEnd) && (
                                    <span className="text-[10px] text-gray-400 font-medium normal-case">(1 Hari)</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 font-medium">Klik untuk pilih tanggal...</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {hasSelection && (
                            <button type="button" onClick={handleClear} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="Reset">
                                <i className="fas fa-times text-[10px]"></i>
                            </button>
                        )}
                        <i className={`fas fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
                    </div>
                </button>

                {/* Popup */}
                {isOpen && (
                    <div ref={popupRef} className="absolute left-0 right-0 z-50 mt-2 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-2xl shadow-black/10 overflow-hidden animate-fadeIn" style={{ maxWidth: '380px' }}>
                        {/* Hint */}
                        <div className="px-4 pt-3 pb-1">
                            {selectionPhase === 'idle' && (
                                <p className="text-[10px] text-gray-400 italic flex items-center gap-1.5">
                                    <i className="fas fa-hand-pointer text-primary text-[9px]"></i> Klik tanggal mulai
                                </p>
                            )}
                            {selectionPhase === 'start-selected' && (
                                <p className="text-[10px] text-primary font-bold flex items-center gap-1.5 animate-pulse">
                                    <i className="fas fa-hand-pointer text-[9px]"></i> Klik tanggal berakhir
                                </p>
                            )}
                            {selectionPhase === 'complete' && (
                                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1.5">
                                    <i className="fas fa-check-circle text-[9px]"></i> Range terpilih — klik ulang untuk ubah
                                </p>
                            )}
                        </div>

                        {/* Month nav */}
                        <div className="flex items-center justify-between px-4 py-2">
                            <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-90">
                                <i className="fas fa-chevron-left text-[9px] text-gray-500"></i>
                            </button>
                            <span className="text-xs font-black text-gray-700 dark:text-dark-text uppercase tracking-wider">
                                {MONTHS[viewMonth]} {viewYear}
                            </span>
                            <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border flex items-center justify-center hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-90">
                                <i className="fas fa-chevron-right text-[9px] text-gray-500"></i>
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 px-2">
                            {DAYS.map(d => (
                                <div key={d} className="py-1.5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="grid grid-cols-7 px-2 pb-2">
                            {calendarDays.map((cell, i) => {
                                const isToday = sameDay(cell.date, today);
                                const isStart = intStart && sameDay(cell.date, intStart);
                                const isEnd = intEnd && sameDay(cell.date, intEnd);
                                const inRng = previewStart && previewEnd && inRange(cell.date, previewStart, previewEnd);
                                const isPreview = inRng && selectionPhase === 'start-selected';

                                let bg = '', text = cell.inMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600';
                                let extra = '';

                                if (isStart || isEnd) {
                                    bg = 'bg-primary'; text = 'text-white';
                                    extra = 'ring-2 ring-primary/30';
                                    if (isStart && isEnd) extra += ' rounded-lg';
                                    else if (isStart) extra += ' rounded-l-lg';
                                    else extra += ' rounded-r-lg';
                                } else if (inRng) {
                                    bg = isPreview ? 'bg-primary/10' : 'bg-primary/15';
                                    text = cell.inMonth ? 'text-primary font-bold' : 'text-primary/50';
                                }
                                if (isToday && !isStart && !isEnd) extra += ' ring-2 ring-primary/40 rounded-lg';

                                return (
                                    <button key={i} type="button"
                                        onClick={() => handleDayClick(cell.date)}
                                        onMouseEnter={() => handleDayHover(cell.date)}
                                        className={`relative py-2 text-center text-[11px] font-bold cursor-pointer hover:bg-primary/10 ${bg} ${text} ${extra}`}
                                    >
                                        {cell.day}
                                        {isToday && !isStart && !isEnd && (
                                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Time inputs */}
                        {requireTime && intStart && (
                            <div className="grid grid-cols-2 gap-3 px-4 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/20">
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide">Jam Mulai</label>
                                    <input type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)} className="input-standard text-xs !py-1.5" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide">Jam Berakhir</label>
                                    <input type="time" value={endTime} onChange={(e) => handleEndTimeChange(e.target.value)} className="input-standard text-xs !py-1.5" />
                                </div>
                            </div>
                        )}

                        {/* Done button */}
                        {selectionPhase === 'complete' && (
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border">
                                <button type="button" onClick={() => setIsOpen(false)}
                                    className="w-full py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/20">
                                    <i className="fas fa-check mr-1.5"></i> Terapkan
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
