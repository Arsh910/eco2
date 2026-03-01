import { useState, useEffect } from "react";
import { Link2, Copy, Check, LogOut, XCircle, MessageSquare, Files } from "lucide-react";
import ConnectionStatus from "../../../components/connect/ConnectionStatus";
import TextTransferSection from "../../../components/connect/TextTransferSection";
import FileTransferSection from "../../../components/connect/FileTransferSection";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useAuth } from "../../../context/AuthContext";
import { useView } from "../../../context/ViewContext";
import "./DataTransfer.css";

import AppTour from "../../../components/common/AppTour";
import { HelpCircle } from "lucide-react";
import { tourSteps } from "./apptour/appTour";

export default function DataTransfer() {
    const { activeTransferTab, setActiveTransferTab } = useView();
    const { logout, user, guestName, mode } = useAuth();
    const [roomCode, setRoomCode] = useState(null);
    const [joinCode, setJoinCode] = useState("");
    const [codeCopied, setCodeCopied] = useState(false);
    const [qrLoading, setQrLoading] = useState(true);
    const [runTour, setRunTour] = useState(true);


    const handleRestartTour = () => {
        setRunTour(true);
        // Force reset seen state for manual restart
        localStorage.removeItem('eco2_tour_datatransfer');
    };

    useEffect(() => {
        if (roomCode) {
            setQrLoading(true);
        }
    }, [roomCode]);

    const {
        connectionStatus,
        connectedUsers,
        messages,
        sendText,
        sendFile,
        wsRef,
        setFileTransferCallbacks,
        isAuthenticated
    } = useWebSocket(roomCode);

    const handleCopyCode = async () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(newCode);
        console.log("Created new room:", newCode);
        // TODO: Implement actual room creation logic
    };

    return (
        <div className="h-full flex flex-col overflow-y-auto lg:overflow-hidden bg-transparent rounded-2xl mobile-scroll">
            {/* Top Section: Header + Room Code */}
            <div className="flex-shrink-0 mb-4 space-y-4 p-4 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Data Transfer
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Share text and files instantly
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <ConnectionStatus
                            status={roomCode ? connectionStatus : ''}
                            peerCount={connectedUsers.length}
                        />

                        <button
                            onClick={handleRestartTour}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                            title="Show Tutorial"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <AppTour
                    steps={tourSteps}
                    run={runTour}
                    tourKey="datatransfer"
                />

                {/* Connected Users */}
                {roomCode && connectedUsers.length > 0 && (
                    <div className="glass-card bg-white/30 dark:bg-slate-800/30 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                In Room:
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                                {connectedUsers.map((user, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-700 
                                                 rounded-full text-xs shadow-sm border border-slate-200 dark:border-slate-600"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {user}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Room Code Section */}
                <div className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] bg-[var(--bg-window)] overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                                Your Room Code
                            </label>

                            <div className="flex flex-col xl:flex-row gap-4 items-stretch">
                                <div className="flex-1 w-full flex items-stretch gap-2">
                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] 
                                                      border-2 border-[var(--border-subtle)] rounded-xl" data-tour="room-code">
                                        <Link2 className="w-5 h-5 text-[var(--accent-primary)]" />
                                        <code className="text-xl font-bold tracking-wider text-[var(--accent-primary)]">
                                            {roomCode || '---'}
                                        </code>
                                    </div>

                                    <div className="flex flex-row xl:flex-col gap-2">
                                        <button
                                            onClick={handleCopyCode}
                                            className="px-4 py-3 flex-1 flex items-center justify-center gap-2 whitespace-nowrap text-sm h-auto
                                                     bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg
                                                     text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                        >
                                            {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>

                                        {roomCode && (
                                            <button
                                                onClick={() => setRoomCode(null)}
                                                className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
                                                         hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800
                                                         rounded-lg transition-colors flex-1 flex items-center justify-center gap-2 h-auto"
                                                title="Disconnect from room"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* QR Code Display - Side by side on XL, Stacked on Mobile */}
                                {roomCode && (
                                    <div className="w-full xl:w-auto p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-lg border border-slate-100 relative min-w-[64px] min-h-[64px] flex items-center justify-center">
                                            {qrLoading && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${roomCode}`}
                                                alt="Room QR Code"
                                                className={`w-12 h-12 object-contain ${qrLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                                                onLoad={() => setQrLoading(false)}
                                            />
                                        </div>
                                        <div className="flex-1 xl:hidden 2xl:block">
                                            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                                                Scan to Join
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                                Point camera to join.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Join Room */}
                        <div className="flex flex-col h-full" data-tour="join-room">
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                                Join a Room
                            </label>
                            <div className="flex-1 flex items-stretch gap-2">
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                                    placeholder="ENTER CODE"
                                    maxLength={6}
                                    className="flex-1 min-w-0 px-4 py-3 bg-[var(--bg-secondary)] h-auto
                                                 border border-[var(--border-subtle)] rounded-xl
                                                 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]
                                                 text-center text-lg font-mono tracking-wider uppercase
                                                 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                />
                                <button
                                    onClick={() => joinCode.trim() ? handleJoinRoom() : handleCreateNewRoom()}
                                    className="btn-primary px-5 py-3 whitespace-nowrap text-base h-auto flex items-center justify-center"
                                    data-tour="create-join-btn"
                                >
                                    {joinCode.trim() ? 'Join' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Toggle - Only visible on mobile/tablet */}
            <div className="px-4 mb-4 lg:hidden">
                <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-300 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTransferTab('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                            ${activeTransferTab === 'text'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat</span>
                    </button>
                    <button
                        onClick={() => setActiveTransferTab('file')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                            ${activeTransferTab === 'file'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <Files className="w-4 h-4" />
                        <span>Files</span>
                    </button>
                </div>
            </div>

            {/* Bottom Section: Text & File Transfer - Fills remaining height */}
            <div className="flex-1 min-h-[600px] lg:min-h-0 flex flex-col lg:grid lg:grid-cols-2 gap-4 p-4 lg:p-4 pb-20 lg:pb-4">

                {/* Text Transfer Section */}
                <div className={`${activeTransferTab === 'text' ? 'flex' : 'hidden'} lg:flex glass-card rounded-2xl p-4 overflow-hidden flex-col h-full lg:h-auto`} data-tour="text-transfer">
                    <TextTransferSection messages={messages} sendText={sendText} />
                </div>

                {/* File Transfer Section */}
                <div className={`${activeTransferTab === 'file' ? 'flex' : 'hidden'} lg:flex glass-card rounded-2xl p-4 overflow-hidden flex-col h-full lg:h-auto`} data-tour="file-transfer">

                    <FileTransferSection
                        wsRef={{ current: wsRef }}
                        setFileTransferCallbacks={setFileTransferCallbacks}
                    />
                </div>
            </div>
        </div>
    );
}
