import React, { useRef, useEffect, useState } from 'react';

/**
 * Reusable Animated Pill Tabs Component
 * 
 * Usage:
 * <AnimatedTabs 
 *   tabs={[{ id: 'tab1', label: 'Tab 1', icon: 'fa-icon' }]}
 *   activeTab="tab1"
 *   onTabChange={(tabId) => setActiveTab(tabId)}
 * />
 */
export function AnimatedTabs({ tabs, activeTab, onTabChange, className = '' }) {
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    // Update indicator position when active tab changes
    useEffect(() => {
        if (containerRef.current) {
            const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
            const buttons = containerRef.current.querySelectorAll('button');

            if (buttons[activeIndex]) {
                const button = buttons[activeIndex];
                setIndicatorStyle({
                    left: button.offsetLeft,
                    width: button.offsetWidth,
                });
            }
        }
    }, [activeTab, tabs]);

    return (
        <div
            ref={containerRef}
            className={`relative flex bg-gray-200 rounded-xl p-1 ${className}`}
        >
            {/* Animated indicator */}
            <div
                className="absolute top-1 bottom-1 bg-green-600 rounded-lg shadow-sm transition-all duration-300 ease-out"
                style={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                }}
            />

            {/* Tab buttons */}
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 ${activeTab === tab.id
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    {tab.icon && <i className={`fas ${tab.icon} text-[10px]`}></i>}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

/**
 * Simpler version without icons
 */
export function AnimatedTabsSimple({ tabs, activeTab, onTabChange, className = '' }) {
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        if (containerRef.current) {
            const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
            const buttons = containerRef.current.querySelectorAll('button');

            if (buttons[activeIndex]) {
                const button = buttons[activeIndex];
                setIndicatorStyle({
                    left: button.offsetLeft,
                    width: button.offsetWidth,
                });
            }
        }
    }, [activeTab, tabs]);

    return (
        <div
            ref={containerRef}
            className={`relative flex bg-gray-100 rounded-xl p-1 ${className}`}
        >
            {/* Animated indicator */}
            <div
                className="absolute top-1 bottom-1 bg-green-600 rounded-lg shadow-sm transition-all duration-300 ease-out"
                style={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                }}
            />

            {/* Tab buttons */}
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative z-10 flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${activeTab === tab.id
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

/**
 * Day tabs for weekly schedule (6 columns)
 */
export function AnimatedDayTabs({ days, activeDay, onDayChange, className = '' }) {
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    useEffect(() => {
        if (containerRef.current) {
            const activeIndex = days.indexOf(activeDay);
            const buttons = containerRef.current.querySelectorAll('button');

            if (buttons[activeIndex]) {
                const button = buttons[activeIndex];
                setIndicatorStyle({
                    left: button.offsetLeft,
                    width: button.offsetWidth,
                });
            }
        }
    }, [activeDay, days]);

    return (
        <div
            ref={containerRef}
            className={`relative bg-white rounded-xl p-2 shadow-sm grid grid-cols-6 gap-1 ${className}`}
        >
            {/* Animated indicator */}
            <div
                className="absolute top-2 bottom-2 bg-green-500 rounded-lg shadow-md transition-all duration-300 ease-out"
                style={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                }}
            />

            {/* Day buttons */}
            {days.map((day) => (
                <button
                    key={day}
                    onClick={() => onDayChange(day)}
                    className={`relative z-10 py-2.5 rounded-lg text-xs font-medium transition-colors duration-200 text-center ${activeDay === day
                        ? 'text-white'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    {day}
                </button>
            ))}
        </div>
    );
}

/**
 * Date tabs for dynamic dates (today onwards)
 * Shows: "Sen 20", "Sel 21", etc.
 * Supports variable number of dates with horizontal scrolling
 */
export function AnimatedDateTabs({ dates, activeDate, onDateChange, className = '' }) {
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    // Get today's date string for comparison
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (scrollRef.current) {
            const activeIndex = dates.findIndex(d => d.date === activeDate);
            const buttons = scrollRef.current.querySelectorAll('button');

            if (buttons[activeIndex]) {
                const button = buttons[activeIndex];
                // Add padding offset (p-2 = 8px)
                const paddingOffset = 8;
                setIndicatorStyle({
                    left: button.offsetLeft + paddingOffset,
                    width: button.offsetWidth,
                });

                // Scroll active button into view
                button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeDate, dates]);

    // Determine grid columns based on date count
    const getGridClass = () => {
        const count = dates.length;
        if (count <= 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-2';
        if (count === 3) return 'grid-cols-3';
        if (count === 4) return 'grid-cols-4';
        if (count === 5) return 'grid-cols-5';
        if (count === 6) return 'grid-cols-6';
        if (count === 7) return 'grid-cols-7';
        // For more than 7, use scrollable flex layout
        return '';
    };

    const useScroll = dates.length > 7;

    return (
        <div
            ref={containerRef}
            className={`relative bg-white rounded-xl p-2 shadow-sm ${className}`}
        >
            {/* Animated indicator */}
            <div
                className="absolute top-2 bottom-2 bg-green-500 rounded-lg shadow-md transition-all duration-300 ease-out z-0"
                style={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                }}
            />

            {/* Date buttons - Dynamic layout based on count */}
            <div
                ref={scrollRef}
                className={useScroll
                    ? 'flex gap-1 overflow-x-auto relative scrollbar-hide'
                    : `grid ${getGridClass()} gap-0.5 relative`
                }
                style={useScroll ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : {}}
            >
                {dates.map((dateItem) => {
                    const isToday = dateItem.date === today;
                    const isActive = dateItem.date === activeDate;

                    return (
                        <button
                            key={dateItem.date}
                            onClick={() => onDateChange(dateItem.date)}
                            className={`relative z-10 py-2 rounded-lg text-xs font-medium transition-colors duration-200 text-center flex flex-col items-center ${useScroll ? 'flex-shrink-0 min-w-[3rem] px-2' : ''
                                } ${isActive
                                    ? 'text-white'
                                    : isToday
                                        ? 'text-green-600 font-bold'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="text-[10px]">{dateItem.dayName}</span>
                            <span className={`text-sm ${isActive ? 'font-bold' : ''}`}>{dateItem.dayNum}</span>
                            {isToday && !isActive && (
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Helper function to generate 7 dates starting from today
 * Shows: Today, Tomorrow, ..., up to 7 days total
 */
export function generateWeekDates() {
    const dates = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        dates.push({
            date: date.toISOString().split('T')[0], // YYYY-MM-DD
            dayName: dayNames[date.getDay()],
            dayNum: date.getDate(),
            fullDate: date.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
        });
    }

    return dates;
}

/**
 * Helper function to generate dates from API data
 * Takes the keys from API response (kegiatan/rapat by date) and generates date objects
 * Falls back to just today if no data
 */
export function generateDatesFromData(dataByDate) {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dates = [];

    // Get date keys from data and sort them
    const dateKeys = Object.keys(dataByDate || {}).sort();

    // If no dates from API, use today as default
    if (dateKeys.length === 0) {
        const today = new Date();
        return [{
            date: today.toISOString().split('T')[0],
            dayName: dayNames[today.getDay()],
            dayNum: today.getDate(),
            fullDate: today.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
        }];
    }

    // Generate date objects from API date keys
    for (const dateStr of dateKeys) {
        const date = new Date(dateStr + 'T00:00:00');

        dates.push({
            date: dateStr,
            dayName: dayNames[date.getDay()],
            dayNum: date.getDate(),
            fullDate: date.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
        });
    }

    return dates;
}
