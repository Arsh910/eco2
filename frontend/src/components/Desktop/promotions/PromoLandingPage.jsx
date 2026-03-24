import { useEffect } from 'react';
import { useView } from '../../../context/ViewContext';

const PromoLandingPage = () => {
    const { theme } = useView();

    useEffect(() => {
        try {
            const ads = document.querySelectorAll('.adsbygoogle');
            ads.forEach(() => {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            });
        } catch (e) {
            console.error("[AdSense] Failed to load ads on landing page:", e);
        }
    }, []);

    const AdSlot = ({ w, h, x, y, className, styleOverride = {} }) => (
        <div
            className={`absolute ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-md rounded-xl border flex flex-col items-center justify-center p-3 shadow-2xl overflow-hidden group ${className}`}
            style={{
                width: `${w}px`,
                height: `${h}px`,
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                ...styleOverride
            }}
        >
            <span className={`text-[9px] absolute top-1 left-2 uppercase tracking-widest font-bold z-10 pointer-events-none ${theme === 'dark' ? 'text-slate-500/50' : 'text-slate-400/50'}`}>Advertisement</span>
            <div className="w-full h-full relative z-0 flex items-center justify-center pt-2">
                <ins className="adsbygoogle"
                    style={{ display: "block", width: "100%", height: "100%" }}
                    data-ad-client="ca-pub-XXXXXXXXX"
                    data-ad-slot="YYYYYYYYY"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
            </div>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-500/10'}`}></div>
        </div>
    );

    const innerDistance = 320;
    const outerDistance = 660;

    return (
        <div className={`absolute inset-0 z-0 overflow-hidden flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative w-full h-full max-w-[1400px] mx-auto flex items-center justify-center">
                <img
                    src="/logo/logo.png"
                    alt="Eco2 Logo"
                    className="w-48 h-48 object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.8)] filter brightness-110 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 md:-mt-8"
                />

                {/* <AdSlot
                    className="hidden xl:flex top-1/2 left-1/2"
                    w={300} h={600} x={-outerDistance} y={0}
                />

                <AdSlot
                    className="hidden lg:flex top-1/2 left-1/2"
                    w={300} h={600} x={-innerDistance} y={0}
                />

                <AdSlot
                    className="hidden lg:flex top-1/2 left-1/2"
                    w={300} h={600} x={innerDistance} y={0}
                />

                <AdSlot
                    className="hidden xl:flex top-1/2 left-1/2"
                    w={300} h={600} x={outerDistance} y={0}
                />

                <AdSlot
                    className="flex md:hidden z-30 opacity-95 transition-opacity duration-1000"
                    w={320}
                    h={250}
                    x={0}
                    y={0}
                    styleOverride={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 0 50px rgba(0,0,0,0.8)'
                    }}
                /> */}

            </div>
        </div>
    );
};

export default PromoLandingPage;
