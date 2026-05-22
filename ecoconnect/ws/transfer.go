package ws

import (
	"encoding/json"
	"log"
	"net/http"

	"eco2/ecoconnect/relay"

	"github.com/gorilla/websocket"
)

// TransferHandler handles binary file relay:
//
//	/ws/sender/{transfer_id}   — upload side
//	/ws/receiver/{transfer_id} — download side
type TransferHandler struct{}

func NewTransferHandler() *TransferHandler { return &TransferHandler{} }

func (h *TransferHandler) HandleSender(w http.ResponseWriter, r *http.Request) {
	transferID := r.PathValue("transfer_id")
	if transferID == "" {
		http.Error(w, "missing transfer_id", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[sender] upgrade error: %v", err)
		return
	}

	session := relay.GlobalSessions.GetOrCreate(transferID)
	sh := relay.NewSenderHandler(session.Buffer, conn)
	session.SetSender(sh)

	log.Printf("[sender] connected for transfer %s", transferID)

	defer func() {
		// Finish signals the receiver to drain and stop — do NOT Remove here.
		// HandleReceiver owns session cleanup so a sender reconnect (resume)
		// can still find the same session in the map.
		session.Buffer.Finish()
		conn.Close()
		log.Printf("[sender] disconnected for transfer %s", transferID)
	}()

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[sender] read error for %s: %v", transferID, err)
			notifyReceiverSenderGone(session)
			break
		}
		if msgType == websocket.BinaryMessage {
			sh.HandleChunk(data)
		} else {
			log.Printf("[sender] unexpected text message for %s: %s", transferID, string(data))
		}
	}
}

func (h *TransferHandler) HandleReceiver(w http.ResponseWriter, r *http.Request) {
	transferID := r.PathValue("transfer_id")
	if transferID == "" {
		http.Error(w, "missing transfer_id", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[receiver] upgrade error: %v", err)
		return
	}

	// GetOrCreate handles the race where receiver connects before sender
	session := relay.GlobalSessions.GetOrCreate(transferID)
	rh := relay.NewReceiverHandler(session.Buffer, conn, session)
	session.SetReceiver(rh)

	log.Printf("[receiver] connected for transfer %s", transferID)

	defer func() {
		session.Buffer.Finish()
		notifySenderReceiverGone(session)
		relay.GlobalSessions.Remove(transferID)
		conn.Close()
		log.Printf("[receiver] disconnected for transfer %s", transferID)
	}()

	// Gorilla WebSocket requires a reader goroutine to process control frames
	// (ping/pong/close). Without it the browser's pings go unanswered and the
	// browser silently closes the connection, causing the first WriteMessage to
	// fail. This goroutine also finishes the buffer early if the receiver
	// disconnects mid-transfer so the sender stops promptly.
	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				session.Buffer.Finish()
				return
			}
		}
	}()

	// Run blocks until the buffer is drained or the connection breaks
	rh.Run()
}

func notifySenderReceiverGone(session *relay.Session) {
	sh := session.GetSender()
	if sh == nil {
		return
	}
	msg, _ := json.Marshal(map[string]any{
		"type":   "receiver_disconnected",
		"reason": "connection_closed",
	})
	sh.WriteJSON(json.RawMessage(msg))
}

func notifyReceiverSenderGone(session *relay.Session) {
	// Finishing the buffer signals ReceiverHandler.Run() to drain and exit
	session.Buffer.Finish()
}
