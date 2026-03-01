import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageType } from '../utils/fileTransfer/constants.js';

const WS_BASE_URL = 'ws://localhost:8000/ws/';

export const useWebSocket = (roomCode) => {
    const { mode, token, guestName } = useAuth();
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const wsRef = useRef(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // File transfer callbacks (set by FileTransferSection)
    const fileTransferCallbacksRef = useRef({
        onBinaryChunk: null,
        onFileMeta: null,
        onCheckpointAck: null,
        onResumeInfo: null,
        onTransferComplete: null
    });

    useEffect(() => {
        if (!roomCode || !mode) return;

        const connectWebSocket = () => {
            try {
                setConnectionStatus('connecting');

                // Build WebSocket URL based on auth mode
                let wsUrl = `${WS_BASE_URL}${roomCode}/`;

                // Add guest query parameter if in guest mode
                if (mode === 'guest' && guestName) {
                    wsUrl += `?guest=${encodeURIComponent(guestName)}`;
                }

                console.log('Connecting to WebSocket:', wsUrl);
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('WebSocket connected');
                    setConnectionStatus('connected');

                    // If logged in mode, send auth message with token
                    if (mode === 'login' && token) {
                        console.log('Sending auth token...');
                        ws.send(JSON.stringify({
                            type: 'auth',
                            token: token
                        }));
                    } else if (mode === 'guest') {
                        // Guest mode auto-joins, no auth message needed
                        setIsAuthenticated(true);
                    }
                };

                ws.onmessage = async (event) => {
                    // Check if message is binary (ArrayBuffer or Blob) or text (JSON)
                    if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
                        // Binary message - file transfer chunk
                        let arrayBuffer;

                        if (event.data instanceof Blob) {
                            // Convert Blob to ArrayBuffer
                            arrayBuffer = await event.data.arrayBuffer();
                        } else {
                            arrayBuffer = event.data;
                        }

                        console.log('[WebSocket] Binary chunk received, size:', arrayBuffer.byteLength);

                        // Forward to FileReceiver if callback is set
                        if (fileTransferCallbacksRef.current.onBinaryChunk) {
                            fileTransferCallbacksRef.current.onBinaryChunk(arrayBuffer);
                        }
                        return;
                    }

                    // Text message - parse as JSON
                    try {
                        const data = JSON.parse(event.data);
                        console.log('WebSocket message received:', data);

                        // Handle different message types
                        switch (data.type) {
                            case 'auth_success':
                                console.log('Authentication successful:', data.user);
                                setIsAuthenticated(true);
                                break;

                            case 'user_list_update':
                                setConnectedUsers(data.list || []);
                                console.log('Connected users:', data.list);
                                break;

                            case 'copy':
                                // Store received message (text or file)
                                setMessages(prev => [...prev, {
                                    type: 'copy',
                                    copy_text: data.copy_text,  // Match backend field name
                                    file_data: data.file_data,
                                    file_name: data.file_name,
                                    f_user: data.f_user,  // Match backend field name (this is the sender)
                                    timestamp: new Date().toISOString()
                                }]);
                                break;

                            case 'progress':
                                console.log('Upload progress:', data);
                                break;

                            case 'error':
                                console.error('WebSocket error:', data.error);
                                break;

                            // File transfer control messages
                            case MessageType.FILE_META:
                                if (fileTransferCallbacksRef.current.onFileMeta) {
                                    fileTransferCallbacksRef.current.onFileMeta(data.payload || data);
                                }
                                break;

                            case MessageType.CHECKPOINT_ACK:
                                if (fileTransferCallbacksRef.current.onCheckpointAck) {
                                    const payload = data.payload || data;
                                    fileTransferCallbacksRef.current.onCheckpointAck(payload.checkpointIndex);
                                }
                                break;

                            case MessageType.RESUME_INFO:
                                if (fileTransferCallbacksRef.current.onResumeInfo) {
                                    fileTransferCallbacksRef.current.onResumeInfo(data.payload || data);
                                }
                                break;

                            case MessageType.TRANSFER_ACCEPTED:
                                if (fileTransferCallbacksRef.current.onTransferAccepted) {
                                    fileTransferCallbacksRef.current.onTransferAccepted(data.payload || data);
                                }
                                break;

                            case MessageType.TRANSFER_COMPLETE:
                                if (fileTransferCallbacksRef.current.onTransferComplete) {
                                    fileTransferCallbacksRef.current.onTransferComplete(data.payload || data);
                                }
                                break;

                            case MessageType.TRANSFER_PAUSE:
                                if (fileTransferCallbacksRef.current.onTransferPause) {
                                    fileTransferCallbacksRef.current.onTransferPause(data.payload || data);
                                }
                                break;

                            case MessageType.TRANSFER_CANCEL:
                                if (fileTransferCallbacksRef.current.onTransferCancel) {
                                    fileTransferCallbacksRef.current.onTransferCancel(data.payload || data);
                                }
                                break;

                            default:
                                console.log('Unknown message type:', data);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setConnectionStatus('error');
                };

                ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    setConnectionStatus('disconnected');
                    setIsAuthenticated(false);
                };

                wsRef.current = ws;
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                setConnectionStatus('error');
            }
        };

        connectWebSocket();

        // Cleanup on unmount
        return () => {
            if (wsRef.current) {
                console.log('Closing WebSocket connection');
                wsRef.current.close();
            }
        };
    }, [roomCode, mode, token, guestName]);

    // Function to send text message
    const sendText = (text) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isAuthenticated) {
            // Send to backend
            wsRef.current.send(JSON.stringify({
                type: 'copy',
                copy: text  // Backend expects 'copy' field
            }));

            // Add to local messages immediately since backend doesn't echo back to sender
            setMessages(prev => [...prev, {
                type: 'copy',
                copy_text: text,
                f_user: null,  // null means it's from current user (no f_user means sent)
                timestamp: new Date().toISOString()
            }]);

            return true;
        }
        return false;
    };

    // Function to send file
    const sendFile = (fileData, fileName) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isAuthenticated) {
            wsRef.current.send(JSON.stringify({
                type: 'copy',
                file: fileData,
                file_name: fileName
            }));
            return true;
        }
        return false;
    };

    // Set file transfer callbacks
    const setFileTransferCallbacks = (callbacks) => {
        fileTransferCallbacksRef.current = { ...fileTransferCallbacksRef.current, ...callbacks };
    };

    // Send binary message (for file chunks)
    const sendBinary = (arrayBuffer) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(arrayBuffer);
            return true;
        }
        return false;
    };

    return {
        connectionStatus,
        connectedUsers,
        messages,
        sendText,
        sendFile,
        sendBinary,
        setFileTransferCallbacks,
        wsRef: wsRef.current,
        isAuthenticated
    };
};
