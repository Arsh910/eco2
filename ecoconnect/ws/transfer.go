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
		session.Buffer.Finish()
		relay.GlobalSessions.Remove(transferID)
		conn.Close()
		log.Printf("[sender] disconnected for transfer %s", transferID)
	}()

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			// Notify receiver if it's still running so it can clean up
			notifyReceiverSenderGone(session)
			break
		}
		if msgType == websocket.BinaryMessage {
			sh.HandleChunk(data)
		}
		// Text messages from the sender frontend are not expected here;
		// all control flow goes server → sender, not sender → server.
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
