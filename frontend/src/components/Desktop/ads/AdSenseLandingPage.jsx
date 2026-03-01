import React, { useEffect } from 'react';

const AdSenseLandingPage = () => {
    useEffect(() => {
        try {
            // Trigger Google AdSense to fill all ad slots on the page
            const ads = document.querySelectorAll('.adsbygoogle');
            ads.forEach(() => {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            });
        } catch (e) {
            console.error("[AdSense] Failed to load ads on landing page:", e);
        }
    }, []);

    // Helper component for identical ad slots to keep code clean
    const AdSlot = ({ w, h, x, y, className, styleOverride = {} }) => (
        <div
            className={`absolute bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700/50 flex flex-col items-center justify-center p-3 shadow-2xl overflow-hidden group ${className}`}
            style={{
                width: `${w}px`,
                height: `${h}px`,
                // Default transform uses x,y. Can be overridden for exact positioning (like mobile)
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                ...styleOverride
            }}
        >
            <span className="text-slate-500/50 text-[9px] absolute top-1 left-2 uppercase tracking-widest font-bold z-10 pointer-events-none">Advertisement</span>
            <div className="w-full h-full relative z-0 flex items-center justify-center pt-2">
                <ins className="adsbygoogle"
                    style={{ display: "block", width: "100%", height: "100%" }}
                    data-ad-client="ca-pub-XXXXXXXXX"
                    data-ad-slot="YYYYYYYYY"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
            </div>
            {/* Hover glow effect for the ad container itself */}
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        </div>
    );

    // Exact positioning for Desktop Ads (measured outwards from center)
    const innerDistance = 320; // Distance to the first ad (increased from 220 to add gap)
    const outerDistance = 660; // Distance to the second ad (increased from 560)

    return (
        <div className="absolute inset-0 z-0 bg-[#020617] overflow-hidden flex items-center justify-center text-slate-200 min-h-screen">

            {/* Background ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative w-full h-full max-w-[1400px] mx-auto flex items-center justify-center">

                {/* Central Glowing Hub */}
                {/* The ACTUAL Eco2 Logo Image */}
                <img
                    src="/logo/logo.png"
                    alt="Eco2 Logo"
                    className="w-48 h-48 object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.8)] filter brightness-110 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 md:-mt-8"
                />

                {/* --- DESKTOP ADS: TWO ON THE LEFT --- */}

                {/* Outer Left Ad */}
                <AdSlot
                    className="hidden xl:flex top-1/2 left-1/2"
                    w={300} h={600} x={-outerDistance} y={0}
                />

                {/* Inner Left Ad */}
                <AdSlot
                    className="hidden lg:flex top-1/2 left-1/2"
                    w={300} h={600} x={-innerDistance} y={0}
                />

                {/* --- DESKTOP ADS: TWO ON THE RIGHT --- */}

                {/* Inner Right Ad */}
                <AdSlot
                    className="hidden lg:flex top-1/2 left-1/2"
                    w={300} h={600} x={innerDistance} y={0}
                />

                {/* Outer Right Ad */}
                <AdSlot
                    className="hidden xl:flex top-1/2 left-1/2"
                    w={300} h={600} x={outerDistance} y={0}
                />

                {/* MOBILE ONLY: Single Interstitial Ad directly over the logo */}
                <AdSlot
                    className="flex md:hidden z-30 opacity-95 transition-opacity duration-1000"
                    w={320}
                    h={250}
                    x={0}
                    y={0}
                    styleOverride={{
                        // Centers it perfectly in the viewport without needing x,y transforms
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', // Solid background so the logo doesn't bleed through too much
                        boxShadow: '0 0 50px rgba(0,0,0,0.8)'
                    }}
                />

            </div>
        </div>
    );
};

export default AdSenseLandingPage;
