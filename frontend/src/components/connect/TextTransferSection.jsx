import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import "../../pages/eco2apps/connect/DataTransfer.css";

export default function TextTransferSection({ messages = [], sendText }) {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [spotlightId, setSpotlightId] = useState(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!message.trim() || sending || !sendText) return;

        setSending(true);

        try {
            await sendText(message);
            setMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    // Unique feature: Spotlight mode - activated by double-click
    const handleSpotlight = (msgId) => {
        setSpotlightId(msgId);
        setTimeout(() => setSpotlightId(null), 3000);
    };

    const charCount = message.length;
    const maxChars = 10000;

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 to-blue-50 dark:from-[#23153c] dark:to-[#2c1a4a] rounded-xl sm:rounded-2xl overflow-hidden shadow-inner border border-white/20 dark:border-white/5">
            {/* Chat Messages */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2 min-h-0"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center p-6 sm:p-8">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 dark:from-[#ff2a6d] dark:to-[#05d9e8] flex items-center justify-center opacity-50">
                                <Send className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                                No messages yet
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                Start the conversation!
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => {
                            const isReceived = !!msg.f_user;
                            const msgId = msg.id || msg.timestamp || `${Date.now()}-${index}`;
                            const isSpotlighted = spotlightId === msgId;
                            const content = msg.copy_text || msg.message || msg.content || "";
                            const senderName = msg.f_user || "You";

                            return (
                                <div
                                    key={msgId}
                                    className={`flex flex-col ${isReceived ? 'items-start' : 'items-end'} mb-3`}
                                    onDoubleClick={() => handleSpotlight(msgId)}
                                >
                                    {/* Sender Name */}
                                    <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-2">
                                        {senderName}
                                    </span>

                                    {/* Message Bubble */}
                                    <div
                                        className={`
                                            max-w-[75%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm
                                            transition-all duration-300 cursor-pointer
                                            ${isReceived
                                                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-slate-100 backdrop-blur-sm'
                                                : 'bg-gradient-to-br from-purple-500 to-blue-500 dark:from-[#ff2a6d] dark:to-[#05d9e8] text-white shadow-lg shadow-purple-500/20 dark:shadow-[#ff2a6d]/20'
                                            }
                                            ${isSpotlighted
                                                ? 'ring-4 ring-yellow-400 dark:ring-yellow-500 scale-105 shadow-2xl'
                                                : 'hover:shadow-md'
                                            }
                                        `}
                                    >
                                        <p className="text-sm sm:text-base break-words whitespace-pre-wrap">
                                            {content}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Section */}
            <div className="flex-shrink-0 p-3 sm:p-4 bg-white/50 dark:bg-white/5 backdrop-blur-md border-t border-slate-200 dark:border-white/10 rounded-b-xl sm:rounded-b-2xl">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Type a message..."
                            className="w-full px-4 py-2.5 sm:py-3 pr-16 bg-white dark:bg-black/20 
                                     border border-slate-200 dark:border-white/10 rounded-full
                                     text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400
                                     focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-[#ff2a6d]
                                     transition-all shadow-sm"
                            maxLength={maxChars}
                        />
                        {/* Character count inside input */}
                        {message.length > 0 && (
                            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs ${charCount > maxChars * 0.9
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-400 dark:text-slate-500"
                                }`}>
                                {charCount}
                            </span>
                        )}
                    </div>

                    {/* Send Button - Circular */}
                    <button
                        type="submit"
                        disabled={!message.trim() || sending}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 dark:from-[#ff2a6d] dark:to-[#05d9e8]
                                 text-white flex items-center justify-center flex-shrink-0
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-all hover:scale-110 active:scale-95 shadow-lg
                                 hover:shadow-xl disabled:hover:scale-100"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
