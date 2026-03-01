import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Maximize2, Minimize2, X } from 'lucide-react';
import { commands } from './commands';
import { useView } from '../../../context/ViewContext';
import { useAuth } from '../../../context/AuthContext';
import MatrixRain from './MatrixRain';

const Terminal = ({ onClose, onLaunchApp, onProcessStart, onProcessEnd }) => {
    const { user, guestName } = useAuth();
    const username = user?.username || user?.name || guestName || 'guest';

    const [input, setInput] = useState("");
    const [history, setHistory] = useState([
        { type: 'system', content: 'Welcome to EcoShell v1.0' },
        { type: 'system', content: 'Type "help" for a list of commands.' }
    ]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [commandHistory, setCommandHistory] = useState([]);
    const [showMatrix, setShowMatrix] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Context hooks
    const { toggleTheme } = useView();

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
        inputRef.current?.focus();
    }, [history]);

    const executeCommand = async (cmdString) => {
        const trimmed = cmdString.trim();
        if (!trimmed) return;

        // Add to display history
        const newHistory = [...history, { type: 'input', content: `${username}@eco2:~$ ${trimmed}` }];

        // Add to command history for up/down arrow
        setCommandHistory(prev => [...prev, trimmed]);
        setHistoryIndex(-1);

        const [cmdName, ...args] = trimmed.split(" ");
        const command = commands[cmdName];

        if (command) {
            if (onProcessStart) onProcessStart();

            try {
                await command.execute(args, {
                    print: (text, type = 'text') => {
                        newHistory.push({ type, content: text });
                    },
                    clear: () => {
                        newHistory.length = 0; // Clear array
                    },
                    toggleTheme,
                    launchApp: onLaunchApp,
                    setMatrix: setShowMatrix
                });
            } catch (error) {
                newHistory.push({ type: 'error', content: `Execution error: ${error.message}` });
            } finally {
                if (onProcessEnd) onProcessEnd();
            }
        } else {
            newHistory.push({ type: 'error', content: `Command not found: ${cmdName}` });
        }

        setHistory(newHistory);
        setInput("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            executeCommand(input);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex + 1;
                if (newIndex < commandHistory.length) {
                    setHistoryIndex(newIndex);
                    setInput(commandHistory[commandHistory.length - 1 - newIndex]);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(commandHistory[commandHistory.length - 1 - newIndex]);
            } else {
                setHistoryIndex(-1);
                setInput("");
            }
        }
    };

    const handleContainerClick = () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
            inputRef.current?.focus();
        }
    };

    return (
        <>
            {showMatrix && <MatrixRain onExit={() => setShowMatrix(false)} />}
            <div className="flex flex-col h-full bg-[#1e1e1e] text-green-400 font-mono text-sm sm:text-base p-2 rounded-b-xl select-text" onClick={handleContainerClick}>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {history.map((line, i) => (
                        <div key={i} className={`whitespace-pre-wrap break-all ${line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-green-300' : line.type === 'system' ? 'text-blue-300' : 'text-slate-300'}`}>
                            {line.content}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                <div className="flex items-center gap-2 p-2 border-t border-white/10">
                    <span className="text-green-500 font-bold">{username}@eco2:~$</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-slate-100 focus:ring-0"
                        autoFocus
                    />
                </div>
            </div>
        </>
    );
};

export default Terminal;
