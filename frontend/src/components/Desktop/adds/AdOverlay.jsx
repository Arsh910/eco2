import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdOverlay = () => {
    const [adConfig, setAdConfig] = useState(null);

    useEffect(() => {
        const fetchAds = async () => {
            try {
                // Adjust URL if needed based on your API setup
                const response = await axios.get('http://127.0.0.1:8000/api/adds/active/');
                if (response.data && response.data.length > 0) {
                    // Pick the first active ad or random
                    setAdConfig(response.data[0]);
                }
            } catch (error) {
                console.error("Failed to fetch ads:", error);
            }
        };

        fetchAds();
    }, []);

    useEffect(() => {
        if (!adConfig) return;

        // Execute scripts in the injected HTML if necessary
        // ... (rest of the logic remains the same)
        const container = document.getElementById('ad-container-content');
        if (container) {
            const scripts = container.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const script = document.createElement('script');
                script.text = scripts[i].text;
                if (scripts[i].src) script.src = scripts[i].src;
                document.body.appendChild(script);
                // Optionally remove it after appending
            }
        }
    }, [adConfig]);

    if (!adConfig) return null;

    return (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-[728px] pointer-events-auto">
            {/* Ad Container */}
            <div
                id="ad-container-content"
                className="flex justify-center items-end pb-4"
                dangerouslySetInnerHTML={{ __html: adConfig.script_content }}
            />
            {/* Attribution / Close (Optional) */}
            <div className="text-center text-[10px] text-white/30 uppercase tracking-widest pb-1">
                Sponsored
            </div>
        </div>
    );
};

export default AdOverlay;
