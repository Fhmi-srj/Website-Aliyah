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
