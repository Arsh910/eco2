import React, { useState, useRef } from 'react';
import { X, Upload, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import axios from 'axios';

const FeedbackModal = ({ isOpen, onClose, type }) => {
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');
    const fileInputRef = useRef(null);
    const { token } = useAuth(); // Assuming AuthContext provides token

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus(null);

        const formData = new FormData();
        formData.append('type', type);
        formData.append('description', description);
        if (image) {
            formData.append('image', image);
        }

        try {
            await axios.post('http://127.0.0.1:8000/api/settings/feedback/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}` // Assuming JWT auth
                }
            });
            setStatus('success');
            setTimeout(() => {
                onClose();
                setDescription('');
                setImage(null);
                setPreview(null);
                setStatus(null);
            }, 2000);
        } catch (error) {
            console.error('Feedback submission error:', error);
            setStatus('error');
            setMessage('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = type === 'bug' ? 'Report a Bug' : 'Give App Idea';
    const placeholder = type === 'bug'
        ? 'Describe the issue you encountered...'
        : 'Share your idea for a new feature or improvement...';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[var(--bg-window)] backdrop-blur-xl border border-[var(--border-subtle)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-all transform scale-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-8 text-green-500 animate-in fade-in zoom-in duration-300">
                            <CheckCircle size={48} className="mb-4" />
                            <p className="text-lg font-medium">Thank you for your feedback!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === 'error' && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                                    <AlertCircle size={16} />
                                    <span>{message}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Description
                                </label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent outline-none transition-all text-[var(--text-primary)] placeholder-gray-500 resize-none h-32"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Attachment (Optional)
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative cursor-pointer border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-xl p-4 flex flex-col items-center justify-center transition-colors bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        accept="image/*"
                                        className="hidden"
                                    />

                                    {preview ? (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-sm font-medium">Change Image</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)] mb-2 group-hover:text-[var(--accent-primary)] transition-colors" />
                                            <p className="text-sm text-[var(--text-secondary)]">Click to upload image</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
