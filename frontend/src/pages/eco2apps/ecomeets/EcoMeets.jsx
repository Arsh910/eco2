import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
    Mic, MicOff, Video, VideoOff,
    PhoneOff, PhoneCall, Loader,
} from "lucide-react";

const SOCKET_URL = "ws://localhost:8000/ws/ecomeets/random/";

const peerConfiguration = {
    iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ],
};

// ─── Module-level state ──────────────────────────────────────────────────────
let pc = null;              // Single PeerConnection
let localStream = null;
let ws = null;
let myId = null;
let myRole = null;          // "offerer" or "answerer" — assigned by server
let partnerId = null;

function closePC() {
    if (!pc) return;
    pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null;
    pc.close();
    pc = null;
}

// =============================================================================
// Component
// =============================================================================
const EcoMeets = () => {
    const { user, token } = useAuth();

    const localRef = useRef(null);
    const remoteRef = useRef(null);

    const [status, setStatus] = useState("Connecting…");
    const [onlineCount, setOnlineCount] = useState(0);
    const [searching, setSearching] = useState(false);
    const [inCall, setInCall] = useState(false);
    const [muted, setMuted] = useState(false);
    const [vidOff, setVidOff] = useState(false);
    const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);
    const [remoteVideoOff, setRemoteVideoOff] = useState(false);

    // ── Show remote stream ──────────────────────────────────────────────────
    const showRemote = useCallback((stream) => {
        if (remoteRef.current) {
            remoteRef.current.srcObject = stream;
            remoteRef.current.onloadedmetadata = () =>
                remoteRef.current.play().catch(() => { });
        }
    }, []);

    // ── Create single PeerConnection ────────────────────────────────────────
    const createPC = useCallback(() => {
        const conn = new RTCPeerConnection(peerConfiguration);

        if (localStream) {
            localStream.getTracks().forEach((t) => conn.addTrack(t, localStream));
        }

        conn.onicecandidate = (e) => {
            if (e.candidate && ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    typeof: "ice_candidate",
                    candidate: e.candidate,
                }));
            }
        };

        conn.ontrack = (e) => showRemote(e.streams[0]);

        conn.onconnectionstatechange = () => {
            console.log("[PC] state:", conn.connectionState);
            if (conn.connectionState === "connected") {
                setInCall(true);
                setSearching(false);
                setStatus("Connected");
            }
            if (conn.connectionState === "failed" || conn.connectionState === "disconnected") {
                handleEndCall(false);
            }
        };

        pc = conn;
        return conn;
    }, [showRemote]);

    // ── WebRTC: Offerer flow ────────────────────────────────────────────────
    const startAsOfferer = useCallback(async () => {
        try {
            const conn = createPC();
            const offer = await conn.createOffer();
            await conn.setLocalDescription(offer);
            ws.send(JSON.stringify({ typeof: "offer", offer }));
            setStatus("Calling…");
            console.log("[offerer] offer sent");
        } catch (err) {
            console.error("[offerer] error:", err);
        }
    }, [createPC]);

    // ── WebRTC: Answerer flow ───────────────────────────────────────────────
    const handleOffer = useCallback(async (offer) => {
        try {
            const conn = createPC();
            await conn.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await conn.createAnswer();
            await conn.setLocalDescription(answer);
            ws.send(JSON.stringify({ typeof: "answer", answer }));
            setStatus("Connecting…");
            console.log("[answerer] answer sent");
        } catch (err) {
            console.error("[answerer] error:", err);
        }
    }, [createPC]);

    const handleAnswer = useCallback(async (answer) => {
        try {
            if (pc && pc.signalingState !== "stable") {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (err) {
            console.error("[offerer] setRemoteDescription error:", err);
        }
    }, []);

    const handleIce = useCallback((candidate) => {
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => { });
        }
    }, []);

    // ── End call ────────────────────────────────────────────────────────────
    const handleEndCall = useCallback((notify = true) => {
        closePC();
        if (remoteRef.current) remoteRef.current.srcObject = null;

        if (notify && ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ typeof: "endcall" }));
        }

        myRole = null;
        partnerId = null;
        setInCall(false);
        setSearching(false);
        setRemoteAudioMuted(false);
        setRemoteVideoOff(false);
        setStatus("Ready");
    }, []);

    // ── WS message handler ──────────────────────────────────────────────────
    const setupWS = useCallback((socket) => {
        socket.onmessage = (e) => {
            const d = JSON.parse(e.data);

            switch (d.typeof) {
                case "welcome":
                    myId = d.userId;
                    console.log("My ID:", myId, "Name:", d.username);
                    setStatus("Ready");
                    break;

                case "online_count":
                    setOnlineCount(d.count);
                    break;

                case "waiting":
                    setSearching(true);
                    setStatus("Waiting for partner…");
                    break;

                case "matched":
                    myRole = d.role;
                    partnerId = d.partnerId;
                    setSearching(false);
                    console.log(`Matched! Role: ${d.role}, Partner: ${d.partnerName}`);

                    if (d.role === "offerer") {
                        // I'm the offerer — create and send SDP offer
                        startAsOfferer();
                    } else {
                        // I'm the answerer — wait for the offer
                        setStatus(`Matched with ${d.partnerName}…`);
                    }
                    break;

                case "offer":
                    handleOffer(d.offer);
                    break;

                case "answer":
                    handleAnswer(d.answer);
                    break;

                case "ice_candidate":
                    handleIce(d.candidate);
                    break;

                case "media_state":
                    setRemoteAudioMuted(d.audioMuted);
                    setRemoteVideoOff(d.videoOff);
                    break;

                case "endcall":
                case "partner_disconnected":
                    handleEndCall(false);
                    break;

                case "search_cancelled":
                    setSearching(false);
                    setStatus("Ready");
                    break;
            }
        };
    }, [startAsOfferer, handleOffer, handleAnswer, handleIce, handleEndCall]);

    // ── Lifecycle ───────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true, audio: true,
                });
                localStream = stream;
                if (localRef.current) {
                    localRef.current.srcObject = stream;
                    localRef.current.play().catch(() => { });
                }
            } catch {
                setStatus("Camera Error");
                return;
            }

            const socket = new WebSocket(SOCKET_URL);
            socket.onopen = () => {
                ws = socket;
                setupWS(socket);
                console.log("WS connected, sending auth…");

                if (token) {
                    socket.send(JSON.stringify({ type: "auth", token }));
                } else {
                    socket.send(JSON.stringify({ type: "auth_guest" }));
                }
            };
            socket.onerror = () => setStatus("Connection Error");
            socket.onclose = () => console.log("WS closed");
        })();

        return () => {
            ws?.close();
            closePC();
            localStream?.getTracks().forEach((t) => t.stop());
            localStream = null;
            myId = null; myRole = null; partnerId = null;
        };
    }, [setupWS]);

    // ── Controls ────────────────────────────────────────────────────────────
    const findMatch = () => {
        if (!myId || !ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ typeof: "find_match" }));
    };

    const cancelSearch = () => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ typeof: "cancel_search" }));
        }
        setSearching(false);
        setStatus("Ready");
    };

    const toggleMute = () => {
        localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
        const newMuted = !muted;
        setMuted(newMuted);
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ typeof: "media_state", audioMuted: newMuted, videoOff: vidOff }));
        }
    };

    const toggleVideo = () => {
        localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
        const newVidOff = !vidOff;
        setVidOff(newVidOff);
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ typeof: "media_state", audioMuted: muted, videoOff: newVidOff }));
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-[var(--bg-desktop)] text-[var(--text-primary)] overflow-hidden transition-colors duration-300">
            {/* Header */}
            <div className="bg-[var(--bg-window)] p-4 shadow-sm flex justify-between items-center z-10 backdrop-blur-md border-b border-[var(--border-subtle)]">
                <h1 className="text-xl font-bold text-[var(--text-accent)]">
                    EcoMeets{" "}
                    <span className="text-xs text-[var(--text-secondary)] font-normal">
                        Random Chat
                    </span>
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-1 bg-[var(--bg-secondary)] rounded border border-[var(--border-subtle)]">
                        {onlineCount} Online
                    </span>
                    <div className="text-sm font-medium text-[var(--accent-primary)]">{status}</div>
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative flex flex-col md:flex-row items-center justify-center bg-[var(--bg-desktop)] p-4 gap-4 transition-colors duration-300">
                {/* Remote */}
                <div className="relative w-full md:w-1/2 aspect-video bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-xl transition-colors duration-300">
                    <video
                        ref={remoteRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${inCall && remoteVideoOff ? "hidden" : ""}`}
                        style={{ transform: "scaleX(-1)" }}
                    />
                    {/* Remote video off overlay */}
                    {inCall && remoteVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]">
                            <VideoOff className="w-16 h-16 text-[var(--text-secondary)]" />
                        </div>
                    )}
                    {/* Remote audio muted indicator */}
                    {inCall && remoteAudioMuted && (
                        <div className="absolute top-4 right-4 bg-red-500/80 p-2 rounded-full backdrop-blur-sm">
                            <MicOff className="w-5 h-5 text-white" />
                        </div>
                    )}
                    {!inCall && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-dock)] backdrop-blur-sm">
                            {searching ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader className="w-12 h-12 text-[var(--accent-primary)] animate-spin" />
                                    <span className="text-[var(--text-secondary)]">
                                        Waiting for partner…
                                    </span>
                                </div>
                            ) : (
                                <div className="text-[var(--text-secondary)]">
                                    Press Start to find someone
                                </div>
                            )}
                        </div>
                    )}
                    <span className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm text-white">
                        Remote
                    </span>
                </div>

                {/* Local */}
                <div className="relative w-full md:w-1/2 aspect-video bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-xl transition-colors duration-300">
                    <video
                        ref={localRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${vidOff ? "hidden" : ""}`}
                        style={{ transform: "scaleX(-1)" }}
                    />
                    {vidOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]">
                            <VideoOff className="w-16 h-16 text-[var(--text-secondary)]" />
                        </div>
                    )}
                    <span className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm text-white">
                        You
                    </span>
                </div>

                {/* Controls Overlay */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 z-50">
                    <div className="bg-[var(--bg-glass)] backdrop-blur-md border border-[var(--border-highlight)] rounded-full px-3 py-3 flex items-center gap-4 shadow-2xl">
                        {!inCall ? (
                            searching ? (
                                <button
                                    onClick={cancelSearch}
                                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2"
                                >
                                    <PhoneOff className="w-5 h-5" /> Cancel
                                </button>
                            ) : (
                                <button
                                    onClick={findMatch}
                                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-2 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2"
                                >
                                    <PhoneCall className="w-5 h-5" />
                                </button>
                            )
                        ) : (
                            <button
                                onClick={() => handleEndCall(true)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2"
                            >
                                <PhoneOff className="w-5 h-5" /> End Call
                            </button>
                        )}

                        <div className="w-px h-8 bg-[var(--border-highlight)] mx-2" />

                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-full transition ${muted
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-dock)]"
                                }`}
                        >
                            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={toggleVideo}
                            className={`p-3 rounded-full transition ${vidOff
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-dock)]"
                                }`}
                        >
                            {vidOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EcoMeets;
