import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';

function Kaldik() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [tahunAjaran, setTahunAjaran] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'pj'
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        const fetchKaldik = async () => {
            try {
                const response = await api.get('/guru-panel/kaldik');
                setEvents(response.data.events || []);
                setTahunAjaran(response.data.tahun_ajaran || '');
            } catch (err) {
                console.error('Error fetching kaldik', err);
            } finally {
                setLoading(false);
            }
        };
        fetchKaldik();
    }, []);

    const filteredEvents = events.filter(ev => {
        if (filter === 'pj') return ev.type === 'kegiatan' && ev.is_pj;
        return true;
    });

    // Simplified: green = KBM aktif, red = libur, teal = kegiatan
    const getStyle = (type, statusKbm) => {
        if (type === 'kegiatan')
            return { border: 'border-teal-400', dateBg: 'bg-teal-50 text-teal-700' };
        const isLibur = statusKbm && statusKbm.toLowerCase().includes('libur');
        if (isLibur)
            return { border: 'border-red-400', dateBg: 'bg-red-50 text-red-700' };
        return { border: 'border-green-400', dateBg: 'bg-green-50 text-green-700' };
    };

    const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const formatDate = (d) => {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="animate-fadeIn min-h-screen bg-gray-50 flex flex-col">

            {/* ── HEADER ── */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 px-4 pt-6 pb-5 text-white rounded-b-[2rem] shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-chevron-left text-sm"></i>
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Kalender Pendidikan</h1>
                        <p className="text-green-100 text-xs">TA {tahunAjaran}</p>
                    </div>
                </div>

                {/* Filter toggle — inside header, always visible */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-1 flex gap-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5
                            ${filter === 'all' ? 'bg-white text-green-700 shadow' : 'text-white/80 hover:text-white'}`}
                    >
                        <i className="fas fa-calendar-alt"></i>
                        Semua Agenda
                    </button>
                    <button
                        onClick={() => setFilter('pj')}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5
                            ${filter === 'pj' ? 'bg-white text-green-700 shadow' : 'text-white/80 hover:text-white'}`}
                    >
                        <i className="fas fa-user-check"></i>
                        Koordinator
                    </button>
                </div>
            </div>

            {/* ── MAIN ── */}
            <div className="flex-1 px-4 pt-4 pb-24 max-w-2xl mx-auto w-full space-y-2">

                {/* Legend */}
                <div className="flex items-center gap-3 px-1 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-semibold">Keterangan:</span>
                    {[
                        { color: 'bg-green-400', label: 'Aktif' },
                        { color: 'bg-red-400', label: 'Libur' },
                        { color: 'bg-teal-400', label: 'Kegiatan' },
                    ].map(l => (
                        <span key={l.label} className="flex items-center gap-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${l.color}`}></span>
                            <span className="text-[10px] text-gray-500">{l.label}</span>
                        </span>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <i className="fas fa-calendar-times text-gray-300 text-3xl mb-3 block"></i>
                        <p className="text-gray-600 font-medium text-sm">Tidak ada agenda</p>
                        <p className="text-gray-400 text-xs mt-1">
                            {filter === 'pj' ? 'Anda belum ditugaskan sebagai PJ' : 'Belum ada jadwal kalender'}
                        </p>
                    </div>
                ) : (
                    filteredEvents.map((ev, idx) => {
                        const { border, dateBg } = getStyle(ev.type, ev.status_kbm);
                        const d = new Date(ev.start);
                        const day = d.getDate();
                        const mon = MONTHS_ID[d.getMonth()];
                        const isActivity = ev.type === 'kegiatan';

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedEvent(ev)}
                                className={`w-full text-left bg-white rounded-xl shadow-sm border-l-4 ${border} flex items-center gap-3 px-3 py-2.5 hover:shadow-md transition-all active:scale-[0.99]`}
                            >
                                {/* Date box */}
                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${dateBg}`}>
                                    <span className="text-[9px] font-bold uppercase leading-none">{mon}</span>
                                    <span className="text-lg font-black leading-tight">{day}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold text-gray-800 truncate flex-1">{ev.title}</p>
                                        {ev.is_pj && (
                                            <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">Koordinator</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {isActivity ? (
                                            <>
                                                <span className="text-[10px] text-gray-400">
                                                    <i className="fas fa-calendar mr-0.5"></i>
                                                    {formatDate(ev.start)}{ev.end && ev.end !== ev.start ? ` – ${formatDate(ev.end)}` : ''}
                                                </span>
                                                {ev.time_start && ev.time_start !== '00:00' && (
                                                    <span className="text-[10px] text-gray-400">
                                                        <i className="fas fa-clock mr-0.5"></i>{ev.time_start}–{ev.time_end}
                                                    </span>
                                                )}
                                                {ev.tempat && (
                                                    <span className="text-[10px] text-gray-400 truncate max-w-[110px]">
                                                        <i className="fas fa-map-marker-alt mr-0.5 text-red-400"></i>{ev.tempat}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[10px] text-gray-400">
                                                    {formatDate(ev.start)}{ev.end && ev.end !== ev.start ? ` – ${formatDate(ev.end)}` : ''}
                                                </span>
                                                {ev.status_kbm && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium
                                                        ${ev.status_kbm.toLowerCase().includes('libur')
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'}`}>
                                                        {ev.status_kbm}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <i className="fas fa-chevron-right text-gray-300 text-xs flex-shrink-0"></i>
                            </button>
                        );
                    })
                )}
            </div>

            {/* ── MODAL DETAIL ── */}
            {selectedEvent && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

                        {/* Title */}
                        <div className="flex items-start gap-3 mb-5">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                                ${selectedEvent.type === 'kegiatan' ? 'bg-teal-100 text-teal-600' :
                                    selectedEvent.status_kbm?.toLowerCase().includes('libur') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                <i className={`fas ${selectedEvent.type === 'kegiatan' ? 'fa-calendar-check' : 'fa-calendar-alt'}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800">{selectedEvent.title}</p>
                                {selectedEvent.is_pj && (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
                                        🏷 Anda adalah Koordinator kegiatan ini
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <DetailRow icon="fa-calendar" label="Tanggal" value={
                                selectedEvent.start === selectedEvent.end || !selectedEvent.end
                                    ? formatDate(selectedEvent.start)
                                    : `${formatDate(selectedEvent.start)} – ${formatDate(selectedEvent.end)}`
                            } />

                            {selectedEvent.type === 'kegiatan' && (
                                <>
                                    {selectedEvent.time_start && selectedEvent.time_start !== '00:00' && (
                                        <DetailRow icon="fa-clock" label="Waktu" value={`${selectedEvent.time_start} – ${selectedEvent.time_end} WIB`} />
                                    )}
                                    {selectedEvent.tempat && (
                                        <DetailRow icon="fa-map-marker-alt" iconColor="text-red-500" label="Tempat" value={selectedEvent.tempat} />
                                    )}
                                    {selectedEvent.pj && (
                                        <DetailRow icon="fa-user-tie" iconColor="text-purple-500" label="Penanggung Jawab" value={selectedEvent.pj} />
                                    )}
                                    {selectedEvent.pendamping && selectedEvent.pendamping.length > 0 && (
                                        <DetailRow icon="fa-users" iconColor="text-blue-500" label="Guru Pendamping" value={selectedEvent.pendamping.join(', ')} />
                                    )}
                                    {selectedEvent.peserta && (
                                        <DetailRow icon="fa-user-graduate" label="Peserta" value={selectedEvent.peserta} />
                                    )}
                                    {selectedEvent.deskripsi && (
                                        <DetailRow icon="fa-align-left" label="Deskripsi" value={selectedEvent.deskripsi} />
                                    )}
                                </>
                            )}

                            {selectedEvent.type === 'kalender' && (
                                <>
                                    <DetailRow
                                        icon="fa-circle"
                                        iconColor={selectedEvent.status_kbm?.toLowerCase().includes('libur') ? 'text-red-500' : 'text-green-500'}
                                        label="Status KBM"
                                        value={selectedEvent.status_kbm}
                                    />
                                    {selectedEvent.keterangan && (
                                        <DetailRow icon="fa-align-left" label="Keterangan" value={selectedEvent.keterangan} />
                                    )}
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="mt-5 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>, document.body)}
        </div>
    );
}

function DetailRow({ icon, iconColor = 'text-gray-400', label, value }) {
    return (
        <div className="flex gap-3 items-start">
            <div className="w-7 flex items-center justify-center flex-shrink-0 pt-0.5">
                <i className={`fas ${icon} text-sm ${iconColor}`}></i>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-700 leading-snug">{value}</p>
            </div>
        </div>
    );
}

export default Kaldik;
