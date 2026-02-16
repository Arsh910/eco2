import React, { useState, useEffect } from 'react';
import { Wifi, Battery, BatteryCharging } from 'lucide-react';

const StatusBar = ({ currentApp }) => {
    const [time, setTime] = useState(new Date());
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [isCharging, setIsCharging] = useState(false);

    useEffect(() => {
        // Update time every minute
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000 * 60);

        // Initial battery status
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                setBatteryLevel(Math.floor(battery.level * 100));
                setIsCharging(battery.charging);

                battery.addEventListener('levelchange', () => {
                    setBatteryLevel(Math.floor(battery.level * 100));
                });
                battery.addEventListener('chargingchange', () => {
                    setIsCharging(battery.charging);
                });
            });
        }

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-8 bg-[var(--bg-dock)] backdrop-blur-md border-b border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-between px-4 z-50 text-xs font-medium select-none transition-colors duration-300">
            <div className="flex items-center space-x-4">
                <span className="font-bold text-sm">Eco2</span>
                {currentApp && (
                    <span className="font-semibold">{currentApp}</span>
                )}
            </div>

            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <span>{formatDate(time)}</span>
                    <span>{formatTime(time)}</span>
                </div>

                <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4" />
                    <div className="flex items-center space-x-1">
                        <span>{batteryLevel}%</span>
                        {isCharging ? <BatteryCharging className="w-4 h-4" /> : <Battery className="w-4 h-4" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusBar;
