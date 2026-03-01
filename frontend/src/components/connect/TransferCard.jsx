import { Copy, Download, Trash2, Check, FileText, Image as ImageIcon, Video, Music, Archive, File as FileIcon } from "lucide-react";
import { useState } from "react";
import "../pages/DataTransfer.css";

export default function TransferCard({ transfer, onDelete }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (transfer.type === "text") {
            await navigator.clipboard.writeText(transfer.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (transfer.type === "file") {
            // Create a download link
            const a = document.createElement("a");
            a.href = transfer.url || "#";
            a.download = transfer.fileName;
            a.click();
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1024 / 1024).toFixed(1) + " MB";
    };

    const formatTime = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    const getFileIcon = (fileName) => {
        const ext = fileName?.split(".").pop()?.toLowerCase();
        const iconClass = "w-5 h-5";

        if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
            return <ImageIcon className={iconClass} />;
        }
        if (["mp4", "avi", "mov", "webm"].includes(ext)) {
            return <Video className={iconClass} />;
        }
        if (["mp3", "wav", "ogg"].includes(ext)) {
            return <Music className={iconClass} />;
        }
        if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
            return <Archive className={iconClass} />;
        }
        if (["txt", "doc", "docx", "pdf"].includes(ext)) {
            return <FileText className={iconClass} />;
        }
        return <FileIcon className={iconClass} />;
    };

    return (
        <div className={`glass-card rounded-xl p-4 transfer-card-enter transfer-card-${transfer.direction || "sent"}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {transfer.type === "file" && (
                        <div className="file-icon text-sm">
                            {getFileIcon(transfer.fileName)}
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                            {transfer.type === "text" ? "Text Message" : transfer.fileName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTime(transfer.timestamp)}
                        </p>
                    </div>
                </div>

                {/* Direction badge */}
                <span className={`text-xs px-2 py-1 rounded-full ${transfer.direction === "sent"
                    ? "bg-blue-100 dark:bg-cyan-900/30 text-blue-700 dark:text-cyan-400"
                    : "bg-purple-100 dark:bg-pink-900/30 text-purple-700 dark:text-pink-400"
                    }`}>
                    {transfer.direction === "sent" ? "Sent" : "Received"}
                </span>
            </div>

            {/* Content */}
            {transfer.type === "text" && (
                <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                        {transfer.content}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {transfer.content?.length || 0} characters
                    </p>
                </div>
            )}

            {transfer.type === "file" && (
                <div className="mb-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Size: {formatFileSize(transfer.size)}
                    </p>
                    {transfer.progress !== undefined && transfer.progress < 100 && (
                        <div className="progress-bar mt-2">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${transfer.progress}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                {transfer.type === "text" && (
                    <button
                        onClick={handleCopy}
                        className="btn-secondary flex items-center gap-1.5 text-xs"
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                    </button>
                )}

                {transfer.type === "file" && transfer.progress === 100 && (
                    <button
                        onClick={handleDownload}
                        className="btn-secondary flex items-center gap-1.5 text-xs"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download
                    </button>
                )}

                <button
                    onClick={() => onDelete?.(transfer.id)}
                    className="btn-secondary flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 ml-auto"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                </button>
            </div>
        </div>
    );
}
