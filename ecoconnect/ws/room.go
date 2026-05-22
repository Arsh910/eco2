package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"eco2/ecoconnect/hub"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type jwtClaims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// RoomHandler handles the main room WebSocket: /ws/{room}/
type RoomHandler struct {
	Hub       *hub.Hub
	JWTSecret string
}

func NewRoomHandler(h *hub.Hub, secret string) *RoomHandler {
	return &RoomHandler{Hub: h, JWTSecret: secret}
}

func (rh *RoomHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("room")
	if roomID == "" {
		http.Error(w, "missing room id", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[room] upgrade error: %v", err)
		return
	}

	guestName := r.URL.Query().Get("guest")

	client := hub.NewClient(roomID, "")
	if guestName != "" {
		client.DisplayName = guestName
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Write pump — sole goroutine that writes to conn
	go func() {
		defer cancel()
		for {
			select {
			case msg, ok := <-client.Send:
				if !ok {
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// enqueue JSON to the write pump
	var sendMu sync.Mutex
	sendJSON := func(v any) {
		sendMu.Lock()
		defer sendMu.Unlock()
		b, _ := json.Marshal(v)
		select {
		case client.Send <- b:
		default:
		}
	}

	authenticated := false
	isGuest := false

	if guestName != "" {
		isGuest = true
		authenticated = true
		rh.Hub.Join(client)
		log.Printf("[room] guest %q joined room %s", guestName, roomID)
	} else {
		log.Printf("[room] pending auth connection in room %s", roomID)
	}

	defer func() {
		cancel()
		if authenticated {
			rh.Hub.Leave(client)
		}
		conn.Close()
	}()

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if msgType == websocket.BinaryMessage {
			sendJSON(map[string]string{"error": "binary data not supported on this endpoint"})
			continue
		}

		var msg map[string]any
		if err := json.Unmarshal(data, &msg); err != nil {
			sendJSON(map[string]string{"error": "invalid JSON"})
			continue
		}

		typ := strVal(msg["type"], msg["typeof"])

		// ── Auth phase ──────────────────────────────────────────────────────────
		if !authenticated {
			if typ != "auth" {
				sendJSON(map[string]string{"error": "authentication required"})
				return
			}
			token := strVal(msg["token"])
			claims, err := rh.parseJWT(token)
			if err != nil {
				log.Printf("[room] auth failed: %v", err)
				sendJSON(map[string]string{"error": "authentication failed"})
				return
			}

			username := claims.Username
			if username == "" {
				username = fmt.Sprintf("user_%d", claims.UserID)
			}
			client.DisplayName = username
			authenticated = true
			rh.Hub.Join(client)
			log.Printf("[room] user %q authenticated in room %s", username, roomID)

			sendJSON(map[string]string{
				"type": "auth_success",
				"user": username,
			})
			continue
		}

		// ── Guest restrictions ──────────────────────────────────────────────────
		if isGuest {
			if typ == "resume-request" || typ == "resume-info" {
				continue
			}
			if typ == "file-meta" {
				if payload, ok := msg["payload"].(map[string]any); ok {
					if resumed, _ := payload["resumed"].(bool); resumed {
						sendJSON(map[string]string{"error": "checkpoint usage is restricted to signed-in users"})
						continue
					}
				}
			}
		}

		// ── Authenticated message handling ──────────────────────────────────────
		switch typ {
		case "copy":
			event, _ := json.Marshal(map[string]any{
				"type":      "copy",
				"copy_text": strVal(msg["copy"], msg["payload"]),
				"file_data": msg["file"],
				"file_name": msg["file_name"],
				"f_user":    client.DisplayName,
			})
			rh.Hub.Broadcast(roomID, client.ID, event)

			if msg["file_name"] != nil {
				sendJSON(map[string]any{"type": "progress", "sent": "done"})
			}

		case "file-meta":
			payload := firstNonNil(msg["payload"], msg["disa"])
			event, _ := json.Marshal(map[string]any{
				"type":    typ,
				"payload": payload,
			})
			if payloadMap, ok := payload.(map[string]any); ok {
				if targetUser, _ := payloadMap["targetUser"].(string); targetUser != "" {
					rh.Hub.SendToUser(roomID, client.ID, targetUser, event)
					break
				}
			}
			rh.Hub.Broadcast(roomID, client.ID, event)

		default:
			payload := firstNonNil(msg["payload"], msg["disa"])
			event, _ := json.Marshal(map[string]any{
				"type":    typ,
				"payload": payload,
			})
			rh.Hub.Broadcast(roomID, client.ID, event)
		}
	}
}

func (rh *RoomHandler) parseJWT(tokenStr string) (*jwtClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(rh.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

// strVal returns the first non-empty string from a list of any values.
func strVal(vals ...any) string {
	for _, v := range vals {
		if s, ok := v.(string); ok && s != "" {
			return s
		}
	}
	return ""
}

func firstNonNil(vals ...any) any {
	for _, v := range vals {
		if v != nil {
			return v
		}
	}
	return nil
}
