import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import logoImage from '../../../../images/logo.png';

function AdminLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-30 mb-2">
                <div className="flex items-center justify-between bg-[rgb(243,250,240)] p-4 shadow-md">
                    <div className="flex items-center">
                        <img
                            alt="Logo utama MA ALHIKAM"
                            className="w-6 h-6 mr-2"
                            height="24"
                            width="24"
                            src={logoImage}
                        />
                        <span className="font-semibold text-[#1f2937] text-lg select-none">
                            MA ALHIKAM
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle menu"
                        className="text-[#4a4a4a] focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'} fa-lg text-green-700`}></i>
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Mobile Sidebar Drawer */}
                <div
                    className={`
                        fixed top-0 left-0 h-full z-50
                        transform transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}
                >
                    <AdminSidebar
                        onClose={() => setSidebarOpen(false)}
                        isCollapsed={false}
                        onToggleCollapse={() => { }}
                    />
                </div>
            </header>

            <div className="w-full flex-1 flex">
                {/* Desktop Sidebar - Sticky */}
                <aside className="hidden md:block sticky top-0 h-screen flex-shrink-0 transition-all duration-300 ease-in-out">
                    <AdminSidebar
                        onClose={() => { }}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={toggleCollapse}
                    />
                </aside>

                {/* Main Content - Scrollable */}
                <main className="flex-1 min-h-screen overflow-y-auto flex flex-col bg-transparent p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
