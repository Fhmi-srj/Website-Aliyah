import React from 'react';
import { useNavigate } from 'react-router-dom';

function ComingSoon({ title = 'Fitur', icon = 'fa-clock' }) {
    const navigate = useNavigate();

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
            <div className="text-center">
                {/* Icon */}
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className={`fas ${icon} text-4xl text-green-600`}></i>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>

                {/* Coming Soon Badge */}
                <span className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium px-4 py-1 rounded-full mb-4">
                    Coming Soon
                </span>

                {/* Description */}
                <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                    Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia.
                    Nantikan update selanjutnya!
                </p>

                {/* Animation */}
                <div className="flex justify-center gap-1 mb-8">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>

                {/* Back Button */}
                <button
                    onClick={() => navigate('/guru')}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                    Kembali ke Beranda
                </button>
            </div>
        </div>
    );
}

export default ComingSoon;
