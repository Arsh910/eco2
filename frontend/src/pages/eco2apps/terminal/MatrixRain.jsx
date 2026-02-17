import React, { useEffect, useRef } from 'react';

const MatrixRain = ({ onExit }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas to full screen
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Matrix characters (katakana + latin)
        const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const charArray = chars.split('');

        const fontSize = 16;
        const columns = canvas.width / fontSize;

        // Array of drops - one per column
        const drops = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }

        const draw = () => {
            // Black BG for the canvas
            // Translucent BG to show trail
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0F0'; // Green text
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Sending the drop back to the top randomly after it has crossed the screen
                // Adding randomness to the reset to make the drops scattered on the Y axis
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                // Incrementing Y coordinate
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 33);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 bg-black cursor-pointer"
            onClick={onExit}
        >
            <canvas ref={canvasRef} className="block w-full h-full" />
            <div className="absolute top-4 right-4 text-green-500 font-mono text-sm opacity-50 select-none">
                Click anywhere to exit the Matrix
            </div>
        </div>
    );
};

export default MatrixRain;
