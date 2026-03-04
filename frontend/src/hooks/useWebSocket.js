import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageType } from '../utils/fileTransfer/constants.js';

const WS_BASE_URL = `${import.meta.env.VITE_API_SOCKET}/ws/`;

export const useWebSocket = (roomCode) => {
    const { mode, token, guestName } = useAuth();
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const wsRef = useRef(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
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

                let wsUrl = `${WS_BASE_URL}${roomCode}/`;
                if (mode === 'guest' && guestName) {
                    wsUrl += `?guest=${encodeURIComponent(guestName)}`;
                }

                //console.log('Connecting to WebSocket:', wsUrl);
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    //console.log('WebSocket connected');
                    setConnectionStatus('connected');

                    // If logged in mode, send auth message with token
                    if (mode === 'login' && token) {
                        //console.log('Sending auth token...');
                        ws.send(JSON.stringify({
                            type: 'auth',
                            token: token
                        }));
                    } else if (mode === 'guest') {
                        setIsAuthenticated(true);
                    }
                };

                ws.onmessage = async (event) => {
                    if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
                        let arrayBuffer;

                        if (event.data instanceof Blob) {
                            arrayBuffer = await event.data.arrayBuffer();
                        } else {
                            arrayBuffer = event.data;
                        }

                        //console.log('[WebSocket] Binary chunk received, size:', arrayBuffer.byteLength);
                        if (fileTransferCallbacksRef.current.onBinaryChunk) {
                            fileTransferCallbacksRef.current.onBinaryChunk(arrayBuffer);
                        }
                        return;
                    }

                    try {
                        const data = JSON.parse(event.data);
                        //console.log('WebSocket message received:', data);

                        switch (data.type) {
                            case 'auth_success':
                                //console.log('Authentication successful:', data.user);
                                setIsAuthenticated(true);
                                break;

                            case 'user_list_update':
                                setConnectedUsers(data.list || []);
                                //console.log('Connected users:', data.list);
                                break;

                            case 'copy':
                                setMessages(prev => [...prev, {
                                    type: 'copy',
                                    copy_text: data.copy_text,
                                    file_data: data.file_data,
                                    file_name: data.file_name,
                                    f_user: data.f_user,
                                    timestamp: new Date().toISOString()
                                }]);
                                break;

                            case 'progress':
                                //console.log('Upload progress:', data);
                                break;

                            case 'error':
                                console.error('WebSocket error:', data.error);
                                break;

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
                            //console.log('Unknown message type:', data);
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
                    //console.log('WebSocket disconnected');
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
        return () => {
            if (wsRef.current) {
                //console.log('Closing WebSocket connection');
                wsRef.current.close();
            }
        };
    }, [roomCode, mode, token, guestName]);

    const sendText = (text) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isAuthenticated) {
            wsRef.current.send(JSON.stringify({
                type: 'copy',
                copy: text
            }));

            setMessages(prev => [...prev, {
                type: 'copy',
                copy_text: text,
                f_user: null,
                timestamp: new Date().toISOString()
            }]);

            return true;
        }
        return false;
    };
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

    const setFileTransferCallbacks = useCallback((callbacks) => {
        fileTransferCallbacksRef.current = { ...fileTransferCallbacksRef.current, ...callbacks };
    }, []);

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
        wsRef,
        isAuthenticated
    };
};
