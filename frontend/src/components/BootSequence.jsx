import React, { useState, useEffect, useRef } from 'react';

export default function BootSequence({ onComplete, type = 'boot' }) {
    const [isFadingOut, setIsFadingOut] = useState(false);
    const videoRef = useRef(null);

    const handleVideoEnd = () => {
        if (type === 'loading') return;
        setIsFadingOut(true);
    };

    const handleTransitionEnd = () => {
        if (isFadingOut && onComplete) {
            onComplete();
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.play().catch(err => {
                console.warn("Boot video autoplay blocked:", err);
                if (type === 'boot') {
                    handleVideoEnd();
                }
            });
        }
    }, [type]);

    return (
        <div
            className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-1000 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onTransitionEnd={handleTransitionEnd}
        >
            <video
                ref={videoRef}
                src="/video/boot.mp4"
                className="w-50 h-50 object-cover"
                autoPlay
                muted
                playsInline
                loop={type === 'loading'}
                onEnded={handleVideoEnd}
            />
        </div>
    );
}
