package relay

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// ReceiverHandler drains the TransferBuffer and forwards binary chunks
// to the downloading client.
type ReceiverHandler struct {
	buffer     *TransferBuffer
	conn       *websocket.Conn
	session    *Session
	writeMu    sync.Mutex
	totalBytes int64
	chunks     int
}

func NewReceiverHandler(buf *TransferBuffer, conn *websocket.Conn, session *Session) *ReceiverHandler {
	return &ReceiverHandler{buffer: buf, conn: conn, session: session}
}

// Run blocks until the transfer is complete or the connection breaks.
func (h *ReceiverHandler) Run() {
	defer h.buffer.Finish()

	for {
		chunk := h.buffer.GetChunk()
		if chunk == nil {
			break
		}

		h.writeMu.Lock()
		err := h.conn.WriteMessage(websocket.BinaryMessage, chunk.Data)
		h.writeMu.Unlock()

		if err != nil {
			log.Printf("[ReceiverHandler] write error for %s: %v", h.buffer.TransferID, err)
			break
		}

		h.totalBytes += int64(len(chunk.Data))
		h.chunks++

		// Let the sender know it can send more if it was paused
		if sender := h.session.GetSender(); sender != nil {
			sender.CheckResume()
		}
	}
}
