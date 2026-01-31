import React from 'react';

// Base skeleton pulse animation
const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

// Skeleton for Beranda page
export function BerandaSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {/* Welcome Card Skeleton */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/30 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/30 rounded w-20 animate-pulse"></div>
                        <div className="h-5 bg-white/30 rounded w-40 animate-pulse"></div>
                        <div className="h-3 bg-white/30 rounded w-32 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex justify-between">
                    <div className="h-4 bg-white/30 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-white/30 rounded w-24 animate-pulse"></div>
                </div>
            </div>

            {/* Stats Card Skeleton */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg p-2">
                                <div className="h-4 bg-gray-200 rounded w-8 mb-1 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Utama Skeleton */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="h-5 bg-gray-200 rounded w-28 mb-4 animate-pulse"></div>
                <div className="grid grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-gray-200 rounded-xl p-3 h-16 animate-pulse"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Skeleton for Jadwal page
export function JadwalSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {/* Search Bar Skeleton */}
            <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>

            {/* Tabs Skeleton */}
            <div className="flex bg-gray-100 rounded-xl p-1">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1 h-10 bg-gray-100 rounded-lg"></div>
            </div>

            {/* Cards Skeleton */}
            <div className="space-y-4">
                {/* Date Header */}
                <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>

                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                            <div className="h-5 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-28 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Skeleton for Riwayat page
export function RiwayatSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {/* Search Bar Skeleton */}
            <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>

            {/* Tabs Skeleton */}
            <div className="flex bg-gray-100 rounded-xl p-1">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse mx-0.5"></div>
                ))}
            </div>

            {/* Filter Skeleton */}
            <div className="flex gap-2">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>

            {/* Cards Skeleton */}
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Skeleton for Profil page
export function ProfilSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {/* Profile Header Skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-40 mx-auto mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse"></div>
            </div>

            {/* Info Cards Skeleton */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1 space-y-1">
                            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Buttons Skeleton */}
            <div className="space-y-2">
                <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
        </div>
    );
}

// Skeleton for Pencarian page
export function PencarianSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {/* Search Bar Skeleton */}
            <div className="h-12 bg-white rounded-xl shadow-sm animate-pulse"></div>

            {/* Category Filter Chips Skeleton */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-9 bg-white rounded-full w-24 flex-shrink-0 shadow-sm animate-pulse"></div>
                ))}
            </div>

            {/* Day Filter Skeleton */}
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-8 bg-white rounded-lg w-16 flex-shrink-0 shadow-sm animate-pulse"></div>
                    ))}
                </div>
            </div>

            {/* Results Container Skeleton */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-3 border-b border-gray-100">
                    <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>

                {/* Results List */}
                <div className="divide-y divide-gray-50">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-3 flex items-start gap-3">
                            {/* Icon */}
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0 animate-pulse"></div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                            </div>

                            {/* Right side badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="h-5 bg-gray-200 rounded-full w-14 animate-pulse"></div>
                                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Skeleton for Search Results only (used inline)
export function SearchResultsSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
            <div className="p-3 border-b border-gray-100">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="divide-y divide-gray-50">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-3 flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="h-5 bg-gray-200 rounded-full w-14"></div>
                            <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Generic Card Skeleton
export function CardSkeleton({ count = 3 }) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            ))}
        </div>
    );
}

export default SkeletonPulse;
