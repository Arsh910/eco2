package hub

import (
	"encoding/json"
	"sync"
	"sync/atomic"
)

var clientIDCounter atomic.Int64

func newClientID() string {
	id := clientIDCounter.Add(1)
	b := make([]byte, 0, 20)
	for id > 0 {
		b = append([]byte{byte('0' + id%10)}, b...)
		id /= 10
	}
	return string(b)
}

// Client represents a connected WebSocket client in a room.
// The actual WebSocket conn is owned by ws/room.go — hub only writes to Send.
type Client struct {
	ID          string
	DisplayName string
	RoomID      string
	Send        chan []byte
}

func NewClient(roomID, displayName string) *Client {
	return &Client{
		ID:          newClientID(),
		DisplayName: displayName,
		RoomID:      roomID,
		Send:        make(chan []byte, 256),
	}
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[string]*Client
}

func New() *Hub {
	return &Hub{rooms: make(map[string]map[string]*Client)}
}

func (h *Hub) Join(client *Client) {
	h.mu.Lock()
	if h.rooms[client.RoomID] == nil {
		h.rooms[client.RoomID] = make(map[string]*Client)
	}
	h.rooms[client.RoomID][client.ID] = client
	h.mu.Unlock()

	h.broadcastUserList(client.RoomID, client.DisplayName)
}

func (h *Hub) Leave(client *Client) {
	h.mu.Lock()
	room := h.rooms[client.RoomID]
	if room != nil {
		delete(room, client.ID)
		if len(room) == 0 {
			delete(h.rooms, client.RoomID)
		}
	}
	h.mu.Unlock()

	h.broadcastUserList(client.RoomID, "")
}

// Broadcast sends msg to all clients in the room except the sender.
func (h *Hub) Broadcast(roomID, senderID string, msg []byte) {
	h.mu.RLock()
	room := h.rooms[roomID]
	targets := make([]*Client, 0, len(room))
	for id, c := range room {
		if id != senderID {
			targets = append(targets, c)
		}
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.Send <- msg:
		default:
			// slow client — drop rather than block
		}
	}
}

// SendToUser sends msg to the one client in the room whose DisplayName matches
// targetDisplayName (excluding the sender). Returns true if delivered.
func (h *Hub) SendToUser(roomID, senderID, targetDisplayName string, msg []byte) bool {
	h.mu.RLock()
	var target *Client
	for id, c := range h.rooms[roomID] {
		if id != senderID && c.DisplayName == targetDisplayName {
			target = c
			break
		}
	}
	h.mu.RUnlock()

	if target == nil {
		return false
	}
	select {
	case target.Send <- msg:
		return true
	default:
		return false
	}
}

func (h *Hub) getUserList(roomID string) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	room := h.rooms[roomID]
	names := make([]string, 0, len(room))
	for _, c := range room {
		names = append(names, c.DisplayName)
	}
	return names
}

func (h *Hub) broadcastUserList(roomID, newUser string) {
	users := h.getUserList(roomID)

	msg, _ := json.Marshal(map[string]any{
		"type":     "user_list_update",
		"list":     users,
		"new_user": newUser,
	})

	h.mu.RLock()
	room := h.rooms[roomID]
	targets := make([]*Client, 0, len(room))
	for _, c := range room {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.Send <- msg:
		default:
		}
	}
}
