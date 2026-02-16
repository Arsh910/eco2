import { useState, useRef } from "react";
import { Upload, File } from "lucide-react";
import "../pages/DataTransfer.css";

export default function DropZone({ onFilesSelected, accept = "*", maxSize = 1024 * 1024 * 1024 * 1024 }) { // Default 1TB
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if we're leaving the drop zone completely
        if (e.currentTarget === e.target) {
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

        const files = Array.from(e.dataTransfer.files);
        validateAndEmitFiles(files);
    };

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files);
        validateAndEmitFiles(files);
        // Reset input so same file can be selected again
        e.target.value = "";
    };

    const validateAndEmitFiles = (files) => {
        // Filter files based on size
        const validFiles = files.filter((file) => {
            if (file.size > maxSize) {
                console.warn(`File ${file.name} exceeds max size of ${maxSize / 1024 / 1024 / 1024}GB`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            onFilesSelected(validFiles);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`drop-zone ${isDragging ? "drag-over" : ""} cursor-pointer`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={accept}
                onChange={handleFileInput}
                className="hidden"
            />

            <div className="flex flex-col items-center justify-center py-6 px-6 text-center">
                <div className={`mb-3 p-3 rounded-full transition-colors ${isDragging
                    ? "bg-purple-100 dark:bg-purple-900/30"
                    : "bg-slate-100 dark:bg-slate-800"
                    }`}>
                    {isDragging ? (
                        <File className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    ) : (
                        <Upload className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                    )}
                </div>

                <h3 className="text-base font-semibold mb-1.5 text-slate-900 dark:text-slate-100">
                    {isDragging ? "Drop files here" : "Drag & drop files"}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    or click to browse
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-500">
                    Supports 100GB+ files
                </p>
            </div>
        </div>
    );
}
