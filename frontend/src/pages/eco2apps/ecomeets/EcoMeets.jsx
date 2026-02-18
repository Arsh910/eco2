/**
 * EcoMeets.jsx — Architecture B: Server-Managed Matching + Role Assignment.
 *
 * Key differences from v1 (dual-peer):
 *   • Only ONE RTCPeerConnection per user.
 *   • Server decides roles: "offerer" creates SDP, "answerer" waits.
 *   • Signaling is point-to-point (server routes directly to partner).
 *   • No sessionId needed — server handles matching.
 *   • No polling interval — matching is instant on server side.
 */
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
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 p-4 shadow-md flex justify-between items-center z-10">
                <h1 className="text-xl font-bold text-green-400">
                    EcoMeets{" "}
                    <span className="text-xs text-gray-500 font-normal">
                        Random Chat
                    </span>
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-xs px-2 py-1 bg-gray-800 rounded border border-gray-700">
                        {onlineCount} Online
                    </span>
                    <div className="text-sm font-medium text-blue-400">{status}</div>
                </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative flex flex-col md:flex-row items-center justify-center bg-gray-950 p-4 gap-4">
                {/* Remote */}
                <div className="relative w-full md:w-1/2 aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                    <video
                        ref={remoteRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${inCall && remoteVideoOff ? "hidden" : ""}`}
                        style={{ transform: "scaleX(-1)" }}
                    />
                    {/* Remote video off overlay */}
                    {inCall && remoteVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <VideoOff className="w-16 h-16 text-gray-600" />
                        </div>
                    )}
                    {/* Remote audio muted indicator */}
                    {inCall && remoteAudioMuted && (
                        <div className="absolute top-4 right-4 bg-red-500/20 p-2 rounded-full">
                            <MicOff className="w-5 h-5 text-red-400" />
                        </div>
                    )}
                    {!inCall && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                            {searching ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                                    <span className="text-gray-300">
                                        Waiting for partner…
                                    </span>
                                </div>
                            ) : (
                                <div className="text-gray-500">
                                    Press Start to find someone
                                </div>
                            )}
                        </div>
                    )}
                    <span className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm">
                        Remote
                    </span>
                </div>

                {/* Local */}
                <div className="relative w-full md:w-1/2 aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                    <video
                        ref={localRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${vidOff ? "hidden" : ""}`}
                        style={{ transform: "scaleX(-1)" }}
                    />
                    {vidOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <VideoOff className="w-16 h-16 text-gray-600" />
                        </div>
                    )}
                    <span className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm">
                        You
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-900 p-6 flex justify-center items-center gap-6 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {!inCall ? (
                    searching ? (
                        <button
                            onClick={cancelSearch}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2"
                        >
                            <PhoneOff className="w-5 h-5" /> Cancel
                        </button>
                    ) : (
                        <button
                            onClick={findMatch}
                            className="bg-green-600 hover:bg-green-700 text-white px-10 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2"
                        >
                            <PhoneCall className="w-5 h-5" /> Start
                        </button>
                    )
                ) : (
                    <button
                        onClick={() => handleEndCall(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-10 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center gap-2"
                    >
                        <PhoneOff className="w-5 h-5" /> End Call
                    </button>
                )}

                <div className="w-px h-10 bg-gray-700 mx-2" />

                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition ${muted
                        ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                >
                    {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition ${vidOff
                        ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                >
                    {vidOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
};

export default EcoMeets;
