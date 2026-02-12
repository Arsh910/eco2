import React, { useState, useEffect, useRef } from 'react';

export default function BootSequence({ onComplete }) {
    const [isFadingOut, setIsFadingOut] = useState(false);
    const videoRef = useRef(null);

    const handleVideoEnd = () => {
        // Start the fade out animation
        setIsFadingOut(true);
    };

    const handleTransitionEnd = () => {
        // Once fade out is done, notify parent to unmount
        if (isFadingOut) {
            onComplete();
        }
    };

    // Fallback: If video fails to autoplay or errors, complete immediately
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.play().catch(err => {
                console.warn("Boot video autoplay blocked:", err);
                // If blocked, maybe show a "Click to Start" button? 
                // For now, let's just skip to the app to avoid blocking the user.
                handleVideoEnd();
            });
        }
    }, []);

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
                onEnded={handleVideoEnd}
            />
        </div>
    );
}
