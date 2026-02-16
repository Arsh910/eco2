import { useState, useEffect, useRef } from "react";
import { X, Pause, Play, XCircle, Upload, Files } from "lucide-react";
import { FileSender } from "../../utils/fileTransfer/FileSender.js";
import { FileReceiver } from "../../utils/fileTransfer/FileReceiver.js";
import { generateFileId, formatBytes, formatSpeed, formatDuration, calculateETA, downloadFromOPFS } from "../../utils/fileTransfer/helpers.js";
import { TransferState } from "../../utils/fileTransfer/constants.js";
import "../../pages/eco2apps/connect/DataTransfer.css";

export default function FileTransferSection({ wsRef, setFileTransferCallbacks }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // Track active sender and receiver instances
    const activeSendersRef = useRef(new Map()); // fileId -> FileSender instance
    const activeReceiverRef = useRef(null); // Only one receiver at a time
    const fileInputRef = useRef(null); // For file selection button
    const dragCounter = useRef(0);

    useEffect(() => {
        if (!setFileTransferCallbacks) return;

        // Set up WebSocket callbacks for file transfer
        setFileTransferCallbacks({
            onBinaryChunk: async (arrayBuffer) => {
                if (activeReceiverRef.current) {
                    await activeReceiverRef.current.handleBinaryChunk(arrayBuffer);
                }
            },
            onFileMeta: async (meta) => {
                console.log('[FileTransferSection] Received file-meta:', meta);

                // Check if this is a resume (transfer already exists)
                setTransfers(prev => {
                    const existingTransfer = prev.find(t => t.fileId === meta.fileId);

                    if (existingTransfer && meta.resumed) {
                        // Resume - just update state to TRANSFERRING
                        console.log('[FileTransferSection] Resuming existing transfer');
                        return prev.map(t =>
                            t.fileId === meta.fileId ? {
                                ...t,
                                state: TransferState.TRANSFERRING
                            } : t
                        );
                    }

                    if (existingTransfer) {
                        // Transfer already exists, don't duplicate
                        return prev;
                    }

                    // New transfer - add to list
                    const transferId = meta.fileId;
                    return [...prev, {
                        id: transferId,
                        fileId: meta.fileId,
                        type: 'file',
                        fileName: meta.fileName,
                        size: meta.fileSize,
                        timestamp: new Date(),
                        direction: 'received',
                        state: TransferState.INITIALIZING,
                        progress: 0,
                        bytesTransferred: 0,
                        speed: 0,
                        eta: null,
                        currentCheckpoint: 0,
                        totalCheckpoints: Math.ceil(meta.totalChunks / 128)
                    }];
                });

                // Only create new receiver if doesn't exist or is different fileId
                if (!activeReceiverRef.current || activeReceiverRef.current.fileId !== meta.fileId || meta.resumed) {
                    // For resume, we can skip creating new receiver if it already exists
                    if (meta.resumed && activeReceiverRef.current && activeReceiverRef.current.fileId === meta.fileId) {
                        console.log('[FileTransferSection] Reusing existing receiver for resume');
                        return;
                    }

                    // Create new receiver instance
                    const receiver = new FileReceiver(wsRef.current);
                    activeReceiverRef.current = receiver;

                    // Set receiver callbacks
                    receiver.onProgress = (progress) => {
                        const eta = progress.speed > 0
                            ? calculateETA(meta.fileSize - progress.bytesReceived, progress.speed)
                            : null;

                        setTransfers(prev => prev.map(t =>
                            t.fileId === meta.fileId ? {
                                ...t,
                                progress: progress.percentage,
                                bytesTransferred: progress.bytesReceived,
                                currentCheckpoint: progress.checkpointIndex,
                                speed: progress.speed,
                                eta
                            } : t
                        ));
                    };

                    receiver.onCheckpointCommit = (checkpointIndex) => {
                        console.log('[FileTransferSection] Checkpoint committed:', checkpointIndex);
                    };

                    receiver.onComplete = (result) => {
                        console.log('[FileTransferSection] Transfer complete:', result);
                        setTransfers(prev => prev.map(t =>
                            t.fileId === meta.fileId ? {
                                ...t,
                                state: TransferState.COMPLETED,
                                progress: 100
                            } : t
                        ));
                        activeReceiverRef.current = null;
                    };

                    receiver.onError = (error) => {
                        console.error('[FileTransferSection] Receiver error:', error);
                        setTransfers(prev => prev.map(t =>
                            t.fileId === meta.fileId ? {
                                ...t,
                                state: TransferState.FAILED,
                                error: error.message
                            } : t
                        ));
                    };

                    receiver.onStateChange = (newState) => {
                        setTransfers(prev => prev.map(t =>
                            t.fileId === meta.fileId ? { ...t, state: newState } : t
                        ));
                    };

                    // Handle file-meta (prompts user for save location)
                    await receiver.handleFileMeta(meta);
                }
            },
            onCheckpointAck: (checkpointIndex) => {
                // Forward to active senders
                activeSendersRef.current.forEach(sender => {
                    sender.handleCheckpointAck(checkpointIndex);
                });
            },
            onResumeInfo: (info) => {
                console.log('[FileTransferSection] Resume info:', info);
                // Handle resume if needed
            },
            onTransferComplete: (data) => {
                console.log('[FileTransferSection] Transfer complete notification:', data);
            },
            onTransferPause: (data) => {
                console.log('[FileTransferSection] Transfer paused by sender:', data);
                setTransfers(prev => prev.map(t =>
                    t.fileId === data.fileId ? {
                        ...t,
                        state: TransferState.PAUSED
                    } : t
                ));
            },
            onTransferCancel: (data) => {
                console.log('[FileTransferSection] Transfer cancelled by sender:', data);
                setTransfers(prev => prev.map(t =>
                    t.fileId === data.fileId ? {
                        ...t,
                        state: TransferState.CANCELLED
                    } : t
                ));
                // Cleanup receiver if active
                if (activeReceiverRef.current && activeReceiverRef.current.fileId === data.fileId) {
                    activeReceiverRef.current = null;
                }
            }
        });

        return () => {
            // Cleanup on unmount
            activeSendersRef.current.forEach(sender => {
                sender.cancel();
            });
            if (activeReceiverRef.current) {
                activeReceiverRef.current.cancel();
            }
        };
    }, [wsRef, setFileTransferCallbacks]);

    const handleFilesSelected = (files) => {
        const newFiles = files.map((file) => ({
            id: Date.now() + Math.random(),
            file,
            fileName: file.name,
            size: file.size,
            type: file.type,
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        }));

        setSelectedFiles((prev) => [...prev, ...newFiles]);
    };

    // Global drag and drop handler
    useEffect(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current++;

            // Only show overlay for file drags
            if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
                setIsDragging(true);
            }
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current--;
            if (dragCounter.current === 0) {
                setIsDragging(false);
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            dragCounter.current = 0;

            const files = Array.from(e.dataTransfer.files || []);
            if (files.length > 0) {
                handleFilesSelected(files);
            }
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            handleFilesSelected(files);
        }
        // Reset input so same file can be selected again
        e.target.value = "";
    };

    const handleRemoveFile = (id) => {
        setSelectedFiles((prev) => {
            const file = prev.find((f) => f.id === id);
            if (file?.preview) URL.revokeObjectURL(file.preview);
            return prev.filter((f) => f.id !== id);
        });
    };

    const handleSendFiles = async () => {
        if (selectedFiles.length === 0 || !wsRef.current) return;

        // Send each file using FileSender
        for (const fileData of selectedFiles) {
            // Generate deterministic ID based on file properties for resume support
            const fileId = await generateFileId(fileData.file);
            const sender = new FileSender(fileData.file, fileId, wsRef.current);

            // Store sender instance
            activeSendersRef.current.set(fileId, sender);

            // Add to transfers list
            const transfer = {
                id: Date.now() + Math.random(),
                fileId,
                type: "file",
                fileName: fileData.fileName,
                size: fileData.size,
                timestamp: new Date(),
                direction: "sent",
                state: TransferState.INITIALIZING,
                progress: 0,
                bytesTransferred: 0,
                speed: 0,
                eta: null,
                currentCheckpoint: 0,
                totalCheckpoints: sender.totalCheckpoints,
                url: fileData.preview || "#",
            };

            setTransfers((prev) => [...prev, transfer]);

            // Set sender callbacks
            sender.onProgress = (progress) => {
                setTransfers(prev => prev.map(t =>
                    t.fileId === fileId ? {
                        ...t,
                        progress: (progress.bytesTransferred / progress.totalBytes) * 100,
                        bytesTransferred: progress.bytesTransferred,
                        speed: progress.speed,
                        eta: calculateETA(progress.totalBytes - progress.bytesTransferred, progress.speed),
                        currentCheckpoint: progress.checkpointIndex
                    } : t
                ));
            };

            sender.onCheckpointAck = (checkpointIndex) => {
                console.log(`[FileTransferSection] Checkpoint ${checkpointIndex} acknowledged for ${fileData.fileName}`);
            };

            sender.onComplete = (result) => {
                console.log('[FileTransferSection] Send complete:', result);
                setTransfers(prev => prev.map(t =>
                    t.fileId === fileId ? {
                        ...t,
                        state: TransferState.COMPLETED,
                        progress: 100
                    } : t
                ));
                activeSendersRef.current.delete(fileId);
            };

            sender.onError = (error) => {
                console.error('[FileTransferSection] Sender error:', error);
                setTransfers(prev => prev.map(t =>
                    t.fileId === fileId ? {
                        ...t,
                        state: TransferState.FAILED,
                        error: error.message
                    } : t
                ));
            };

            sender.onStateChange = (newState) => {
                setTransfers(prev => prev.map(t =>
                    t.fileId === fileId ? { ...t, state: newState } : t
                ));
            };

            // Start transfer
            try {
                // Check for saved progress to resume
                const savedProgress = FileSender.loadProgress(fileId);

                if (savedProgress && savedProgress.lastAckedCheckpoint >= 0) {
                    console.log(`[FileTransferSection] Resuming transfer from checkpoint ${savedProgress.lastAckedCheckpoint}`);

                    // Update transfer state to show resuming
                    setTransfers(prev => prev.map(t =>
                        t.fileId === fileId ? {
                            ...t,
                            currentCheckpoint: savedProgress.lastAckedCheckpoint,
                            state: TransferState.TRANSFERRING
                        } : t
                    ));

                    // Resume from last acked checkpoint
                    await sender.startTransfer(savedProgress.lastAckedCheckpoint);
                } else {
                    console.log('[FileTransferSection] Starting new transfer');
                    await sender.startTransfer();
                }
            } catch (error) {
                console.error('[FileTransferSection] Failed to start transfer:', error);
            }
        }

        // Clear selected files
        selectedFiles.forEach((file) => {
            if (file.preview) URL.revokeObjectURL(file.preview);
        });
        setSelectedFiles([]);
    };

    const handlePauseResume = (transferId) => {
        const transfer = transfers.find(t => t.id === transferId);
        if (!transfer) return;

        const sender = activeSendersRef.current.get(transfer.fileId);
        if (!sender) return;

        if (transfer.state === TransferState.TRANSFERRING) {
            sender.pause();
        } else if (transfer.state === TransferState.PAUSED) {
            sender.resume();
        }
    };

    const handleCancelTransfer = (transferId) => {
        const transfer = transfers.find(t => t.id === transferId);
        if (!transfer) return;

        if (transfer.direction === 'sent') {
            const sender = activeSendersRef.current.get(transfer.fileId);
            if (sender) {
                sender.cancel();
                activeSendersRef.current.delete(transfer.fileId);
            }
        } else {
            if (activeReceiverRef.current && activeReceiverRef.current.fileId === transfer.fileId) {
                activeReceiverRef.current.cancel();
                activeReceiverRef.current = null;
            }
        }

        setTransfers(prev => prev.filter(t => t.id !== transferId));
    };

    const handleDeleteTransfer = (id) => {
        setTransfers((prev) => prev.filter((t) => t.id !== id));
    };

    const handleDownload = async (fileName) => {
        try {
            await downloadFromOPFS(fileName);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file. Please try again.');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with File Selection Button */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                        File Transfer
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Supports 100GB+ files
                    </p>
                </div>

                {/* Compact File Selection Button */}
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary flex items-center gap-2 px-3 sm:px-4"
                        title="Select Files"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Select Files</span>
                    </button>
                </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            Selected Files ({selectedFiles.length})
                        </h3>
                        <button
                            onClick={handleSendFiles}
                            className="btn-primary text-sm"
                            disabled={!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN}
                        >
                            Send All
                        </button>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {selectedFiles.map((fileData) => (
                            <div
                                key={fileData.id}
                                className="group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 
                                         border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-4 transition-all duration-200"
                            >
                                {/* File Preview / Icon */}
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                    {fileData.preview ? (
                                        <img
                                            src={fileData.preview}
                                            alt={fileData.fileName}
                                            className="w-full h-full object-cover transform transition-transform group-hover:scale-110 duration-300"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center">
                                            <Files className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-0.5" />
                                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                                {fileData.fileName.split(".").pop()?.slice(0, 3) || "FILE"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* File Details */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-200 truncate pr-8" title={fileData.fileName}>
                                        {fileData.fileName}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase">
                                            {formatBytes(fileData.size)}
                                        </span>
                                    </div>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => handleRemoveFile(fileData.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 
                                             text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 
                                             rounded-full transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                    title="Remove file"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transfer History */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 min-h-0">
                    {transfers.length === 0 ? (
                        <div className="glass-card rounded-xl p-8 text-center border border-[var(--border-subtle)] bg-[var(--bg-window)]">
                            <p className="text-[var(--text-secondary)]">
                                No transfers yet. Select files to start sharing!
                            </p>
                        </div>
                    ) : (
                        <>
                            {transfers.map((transfer) => (
                                <div
                                    key={transfer.id}
                                    className="glass-card rounded-xl p-4 border border-[var(--border-subtle)] bg-[var(--bg-window)]"
                                >
                                    {/* Transfer Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[var(--text-primary)] truncate">
                                                {transfer.fileName}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatBytes(transfer.size)} • {transfer.direction === 'sent' ? 'Sending' : 'Receiving'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Pause/Resume button for active sends */}
                                            {transfer.direction === 'sent' &&
                                                (transfer.state === TransferState.TRANSFERRING || transfer.state === TransferState.PAUSED) && (
                                                    <button
                                                        onClick={() => handlePauseResume(transfer.id)}
                                                        className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                                                        title={transfer.state === TransferState.TRANSFERRING ? 'Pause' : 'Resume'}
                                                    >
                                                        {transfer.state === TransferState.TRANSFERRING ? (
                                                            <Pause className="w-4 h-4 text-[var(--text-secondary)]" />
                                                        ) : (
                                                            <Play className="w-4 h-4 text-[var(--text-secondary)]" />
                                                        )}
                                                    </button>
                                                )}

                                            {/* Download button for completed received files */}
                                            {transfer.direction === 'received' && transfer.state === TransferState.COMPLETED && (
                                                <button
                                                    onClick={() => handleDownload(transfer.fileName)}
                                                    className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors mr-1"
                                                >
                                                    Download
                                                </button>
                                            )}

                                            {/* Cancel button for active transfers */}
                                            {(transfer.state === TransferState.TRANSFERRING ||
                                                transfer.state === TransferState.PAUSED ||
                                                transfer.state === TransferState.INITIALIZING) && (
                                                    <button
                                                        onClick={() => handleCancelTransfer(transfer.id)}
                                                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                    </button>
                                                )}

                                            {/* Delete button for completed/failed */}
                                            {(transfer.state === TransferState.COMPLETED ||
                                                transfer.state === TransferState.FAILED ||
                                                transfer.state === TransferState.CANCELLED) && (
                                                    <button
                                                        onClick={() => handleDeleteTransfer(transfer.id)}
                                                        className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4 text-[var(--text-secondary)]" />
                                                    </button>
                                                )}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {transfer.state !== TransferState.COMPLETED &&
                                        transfer.state !== TransferState.CANCELLED && (
                                            <div className="mb-2">
                                                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
                                                    <span>{transfer.progress.toFixed(1)}%</span>
                                                    <span>
                                                        Checkpoint {transfer.currentCheckpoint + 1} / {transfer.totalCheckpoints}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2">
                                                    <div
                                                        className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${transfer.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                    {/* Transfer Stats */}
                                    <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                                        <div className="flex items-center gap-3">
                                            {transfer.state === TransferState.TRANSFERRING && (
                                                <>
                                                    <span>{formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.size)}</span>
                                                    <span>•</span>
                                                    <span>{formatSpeed(transfer.speed)}</span>
                                                    {transfer.eta !== null && isFinite(transfer.eta) && (
                                                        <>
                                                            <span>•</span>
                                                            <span>ETA: {formatDuration(transfer.eta)}</span>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            {transfer.state === TransferState.COMPLETED && (
                                                <span className="text-green-600 dark:text-[#05d9e8] font-medium">✓ Complete</span>
                                            )}
                                            {transfer.state === TransferState.PAUSED && (
                                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">⏸ Paused</span>
                                            )}
                                            {transfer.state === TransferState.FAILED && (
                                                <span className="text-red-600 dark:text-[#ff2a6d] font-medium">✗ Failed</span>
                                            )}
                                            {transfer.state === TransferState.CANCELLED && (
                                                <span className="text-[var(--text-secondary)] font-medium">Cancelled</span>
                                            )}
                                        </div>

                                        {transfer.timestamp && (
                                            <span>{new Date(transfer.timestamp).toLocaleTimeString()}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Global Drop Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-purple-500/10 dark:bg-black/80 backdrop-blur-sm 
                              border-4 border-purple-500/50 dark:border-[#ff2a6d]/50 border-dashed m-4 rounded-3xl
                              flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#130a21]/90 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 transform scale-100 border border-slate-200 dark:border-white/10">
                        <div className="p-4 bg-purple-100 dark:bg-[#ff2a6d]/20 rounded-full animate-bounce">
                            <Upload className="w-10 h-10 text-purple-600 dark:text-[#ff2a6d]" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Drop files to upload
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                Release mouse to add files to transfer
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
