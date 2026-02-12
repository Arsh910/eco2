import { useState, useEffect } from "react";
import { Link2, Copy, Check, LogOut, XCircle, MessageSquare, Files } from "lucide-react";
import ConnectionStatus from "../../../components/connect/ConnectionStatus";
import TextTransferSection from "../../../components/connect/TextTransferSection";
import FileTransferSection from "../../../components/connect/FileTransferSection";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useAuth } from "../../../context/AuthContext";
import { useView } from "../../../context/ViewContext";
import ProTransferExperience from "../../../components/connect/ProTransferExperience";
import "./DataTransfer.css";

export default function DataTransfer() {
    const { isProMode, activeTransferTab } = useView();
    const { logout, user, guestName, mode } = useAuth();
    const [roomCode, setRoomCode] = useState(null);
    const [joinCode, setJoinCode] = useState("");
    const [codeCopied, setCodeCopied] = useState(false);

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
        await navigator.clipboard.writeText(roomCode);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const handleJoinRoom = () => {
        if (joinCode.trim()) {
            setRoomCode(joinCode.toUpperCase());
            setJoinCode("");
            console.log("Joined room:", joinCode);
            // TODO: Implement actual room joining logic
        }
    };

    const handleCreateNewRoom = () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(newCode);
        console.log("Created new room:", newCode);
        // TODO: Implement actual room creation logic
    };

    if (isProMode) {
        return <ProTransferExperience />;
    }

    return (
        <div className="h-full flex flex-col overflow-y-auto lg:overflow-hidden bg-transparent rounded-2xl mobile-scroll">
            {/* Top Section: Header + Room Code */}
            <div className="flex-shrink-0 mb-4 space-y-4 p-4 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Data Transfer
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Share text and files instantly
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <ConnectionStatus
                            status={roomCode ? connectionStatus : ''}
                            peerCount={connectedUsers.length}
                        />

                        {/* Logout button removed from here as per previous request */}
                    </div>
                </div>

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
                <div className="glass-card rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                Your Room Code
                            </label>

                            <div className="flex flex-col xl:flex-row gap-4 items-stretch">
                                <div className="flex-1 w-full flex items-stretch gap-2">
                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-pink-900/20 
                                                      border-2 border-purple-200 dark:border-pink-800 rounded-lg">
                                        <Link2 className="w-5 h-5 text-purple-600 dark:text-pink-400" />
                                        <code className="text-xl font-bold tracking-wider text-purple-700 dark:text-pink-300">
                                            {roomCode || '---'}
                                        </code>
                                    </div>

                                    <div className="flex flex-row xl:flex-col gap-2">
                                        <button
                                            onClick={handleCopyCode}
                                            className="btn-secondary px-4 py-3 flex-1 flex items-center justify-center gap-2 whitespace-nowrap text-sm h-auto"
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
                                    <div className="w-full xl:w-auto p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-lg border border-slate-100">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${roomCode}`}
                                                alt="Room QR Code"
                                                className="w-12 h-12 object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 xl:hidden 2xl:block">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                                                Scan to Join
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                Point camera to join.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Join Room */}
                        <div className="flex flex-col h-full">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
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
                                    className="flex-1 min-w-0 px-4 py-3 bg-white dark:bg-slate-800 h-auto
                                                 border border-slate-200 dark:border-slate-700 rounded-lg
                                                 text-slate-900 dark:text-slate-100 placeholder-slate-400
                                                 text-center text-lg font-mono tracking-wider uppercase
                                                 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                />
                                <button
                                    onClick={() => joinCode.trim() ? handleJoinRoom() : handleCreateNewRoom()}
                                    className="btn-primary px-5 py-3 whitespace-nowrap text-base h-auto flex items-center justify-center"
                                >
                                    {joinCode.trim() ? 'Join' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Text & File Transfer - Fills remaining height */}
            <div className="flex-1 min-h-[600px] lg:min-h-0 flex flex-col lg:grid lg:grid-cols-2 gap-4 p-4 lg:p-4 pb-20 lg:pb-4">

                {/* Text Transfer Section */}
                <div className={`glass-card rounded-2xl p-4 overflow-hidden flex-col h-full ${activeTransferTab === 'text' ? 'flex' : 'hidden lg:flex'}`}>
                    <TextTransferSection messages={messages} sendText={sendText} />
                </div>

                {/* File Transfer Section */}
                <div className={`glass-card rounded-2xl p-4 overflow-hidden flex-col h-full ${activeTransferTab === 'file' ? 'flex' : 'hidden lg:flex'}`}>

                    <FileTransferSection
                        wsRef={{ current: wsRef }}
                        setFileTransferCallbacks={setFileTransferCallbacks}
                    />
                </div>
            </div>
        </div>
    );
}
