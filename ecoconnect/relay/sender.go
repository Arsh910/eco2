package relay

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// SenderHandler processes incoming binary chunks from the uploading client
// and writes control signals (ack, pause, resume) back to it.
type SenderHandler struct {
	buffer     *TransferBuffer
	conn       *websocket.Conn
	writeMu    sync.Mutex
	paused     bool
	seq        int
	totalBytes int64
}

func NewSenderHandler(buf *TransferBuffer, conn *websocket.Conn) *SenderHandler {
	return &SenderHandler{buffer: buf, conn: conn}
}

func (h *SenderHandler) HandleChunk(data []byte) {
	log.Printf("[SenderHandler] chunk received: seq=%d size=%d bytes", h.seq, len(data))
	chunk := &Chunk{
		Seq:  h.seq,
		Data: data,
		Time: time.Now(),
	}

	// Proactively pause before buffer blocks
	if !h.paused && h.buffer.ShouldSenderPause() {
		h.sendPause()
		h.paused = true
	}

	ok := h.buffer.AddChunk(chunk)
	if !ok {
		return
	}

	if h.paused && h.buffer.Pressure() < 0.3 {
		h.sendResume()
		h.paused = false
	}

	h.sendAck(h.seq)
	h.seq++
	h.totalBytes += int64(len(data))
}

// CheckResume is called by ReceiverHandler after draining chunks to unpause sender.
func (h *SenderHandler) CheckResume() {
	if h.paused && h.buffer.Pressure() < 0.3 {
		h.sendResume()
		h.paused = false
	}
}

// WriteJSON sends an arbitrary JSON message to the sender client.
func (h *SenderHandler) WriteJSON(v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	h.write(b)
}

func (h *SenderHandler) write(msg []byte) {
	h.writeMu.Lock()
	defer h.writeMu.Unlock()
	h.conn.WriteMessage(websocket.TextMessage, msg) //nolint:errcheck
}

func (h *SenderHandler) sendPause() {
	rate := h.buffer.ConsumptionRate()
	waitSec := 5.0
	if rate > 0 {
		p := h.buffer.Pressure()
		waitSec = (p * float64(h.buffer.MaxBytes) * 0.5) / rate
	}
	h.write(mustJSON(map[string]any{
		"type":              "pause",
		"reason":            "receiver_slow",
		"buffer_pressure":   h.buffer.Pressure(),
		"wait_estimate_sec": waitSec,
	}))
}

func (h *SenderHandler) sendResume() {
	h.write(mustJSON(map[string]any{
		"type":                "resume",
		"buffer_available_mb": h.buffer.AvailableMB(),
	}))
}

func (h *SenderHandler) sendAck(seq int) {
	h.write(mustJSON(map[string]any{
		"type":            "ack",
		"seq":             seq,
		"buffer_pressure": h.buffer.Pressure(),
	}))
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
