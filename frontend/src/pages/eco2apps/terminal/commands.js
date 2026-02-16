// commands.js
import { encryptFile, decryptFile } from '../../../utils/crypto/encryption';

// Helper to trigger file download
const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Helper to pick a file
const pickFile = () => {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                resolve(e.target.files[0]);
            } else {
                resolve(null);
            }
        };
        input.click();
    });
};

export const commands = {
    help: {
        description: "List available commands",
        execute: (args, { print }) => {
            print("EcoShell v1.0 - Available Commands", "system");
            const cmdList = Object.entries(commands)
                .map(([name, cmd]) => `  ${name.padEnd(12)} - ${cmd.description}`)
                .join('\n');
            print(cmdList);
        }
    },
    clear: {
        description: "Clear terminal history",
        execute: (args, { clear }) => clear()
    },
    history: {
        description: "Show command history",
        execute: (args, { print, componentState }) => {
            // We'd need access to command history state, or just user scroll
            print("Use Up/Down arrows to navigate history.", "info");
        }
    },
    echo: {
        description: "Print text to console",
        execute: (args, { print }) => print(args.join(" "))
    },
    theme: {
        description: "Switch theme [dark|light]",
        execute: (args, { print, toggleTheme }) => {
            const mode = args[0];
            if (mode === "light" || mode === "dark") {
                print(`Switching to ${mode} mode...`, "success");
                toggleTheme();
            } else {
                print("Usage: theme [dark|light]", "error");
            }
        }
    },
    open: {
        description: "Open an app [transfer|settings]",
        execute: (args, { print, launchApp }) => {
            const appName = args[0];
            const validApps = ['transfer', 'files', 'settings', 'terminal'];
            if (validApps.includes(appName)) {
                print(`Launching ${appName}...`, "success");
                launchApp(appName);
            } else {
                print(`App not found: ${appName}. Available: ${validApps.join(", ")}`, "error");
            }
        }
    },
    encrypt: {
        description: "Encrypt a file (AES-GCM)",
        execute: async (args, { print }) => {
            print("Step 1: Select a file to encrypt...", "info");
            const file = await pickFile();
            if (!file) {
                print("No file selected.", "error");
                return;
            }
            print(`Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, "info");

            // Simple prompt for password (in a real CLI we'd hide input, here we just ask logic to handle or simple prompt)
            // Since we don't have interactive input stream in this simple implementation, we can use window.prompt 
            // OR we can require it as an arg: encrypt <password> (but that stays in history)
            // Let's use window.prompt for security from history for now, or assume args[0]

            let password = args[0];
            if (!password) {
                // print("Usage: encrypt <password>", "warning"); // History risk
                // print("Using window prompt for security...", "info");
                password = prompt("Enter encryption password:");
            }

            if (!password) {
                print("Password required.", "error");
                return;
            }

            try {
                print("Encrypting...", "system");
                const start = performance.now();
                const encryptedBlob = await encryptFile(file, password);
                const end = performance.now();

                downloadBlob(encryptedBlob, `${file.name}.enc`);
                print(`Success! Encrypted in ${(end - start).toFixed(2)}ms`, "success");
                print(`File downloaded as ${file.name}.enc`, "success");
            } catch (err) {
                print(`Encryption failed: ${err.message}`, "error");
            }
        }
    },
    decrypt: {
        description: "Decrypt a .enc file",
        execute: async (args, { print }) => {
            print("Step 1: Select a .enc file to decrypt...", "info");
            const file = await pickFile();
            if (!file) {
                print("No file selected.", "error");
                return;
            }

            let password = args[0];
            if (!password) {
                password = prompt("Enter decryption password:");
            }

            if (!password) {
                print("Password required.", "error");
                return;
            }

            try {
                print("Decrypting...", "system");
                const decryptedBlob = await decryptFile(file, password);

                // Try to remove .enc extension
                let originalName = file.name.replace(/\.enc$/, '');
                if (originalName === file.name) originalName = `decrypted_${file.name}`;

                downloadBlob(decryptedBlob, originalName);
                print(`Success! File decrypted.`, "success");
            } catch (err) {
                print(`Decryption failed: ${err.message}`, "error");
            }
        }
    },
    netstat: {
        description: "Show network statistics",
        execute: async (args, { print }) => {
            print("Analyzing network traffic...", "system");

            // Simulate a scan
            await new Promise(r => setTimeout(r, 800));

            print("Active Connections:", "info");
            print("PROTO  LOCAL ADDR      REMOTE ADDR     STATUS     LATENCY", "system");
            print("TCP    192.168.1.105   104.21.55.2     ESTABLISHED 24ms");
            print("UDP    0.0.0.0:3000    *:*             LISTENING   -");

            await new Promise(r => setTimeout(r, 500));

            // Simulated P2P status (randomized for realism)
            const p2pStatus = Math.random() > 0.3 ? "CONNECTED" : "SEARCHING";
            const peers = Math.floor(Math.random() * 5);
            print(`P2P MESH: ${p2pStatus} (${peers} peers visible)`, p2pStatus === "CONNECTED" ? "success" : "warning");

            print("--------------------------------------------------", "system");
        }
    },
    ping: {
        description: "Ping a host",
        execute: async (args, { print }) => {
            const host = args[0] || "google.com";
            print(`Pinging ${host} [ICMP sequence]...`, "system");

            for (let i = 0; i < 4; i++) {
                await new Promise(r => setTimeout(r, 600));
                const time = Math.floor(Math.random() * 50) + 10;
                print(`64 bytes from ${host}: icmp_seq=${i} ttl=117 time=${time}ms`);
            }
            print(`--- ${host} ping statistics ---`, "system");
            print(`4 packets transmitted, 4 received, 0% packet loss`, "success");
        }
    },
    matrix: {
        description: "Toggle Matrix rain (Easter Egg)",
        execute: (args, { print, componentState }) => {
            print("Knock, knock, Neo...", "success");
            // If we had a state setter for background passed down, we'd use it here
            // For now just a fun message
        }
    }
};
