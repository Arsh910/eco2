package main

import (
	"log"
	"net/http"

	"eco2/ecoconnect/config"
	"eco2/ecoconnect/hub"
	"eco2/ecoconnect/relay"
	"eco2/ecoconnect/ws"
)

func main() {
	cfg := config.Load()
	relay.GlobalSessions.StartCleanup()

	h := hub.New()
	roomHandler := ws.NewRoomHandler(h, cfg.JWTSecret)
	transferHandler := ws.NewTransferHandler()

	mux := http.NewServeMux()

	// Room broker  — /ws/{room}/
	mux.Handle("/ws/{room}/", roomHandler)

	// File relay — no trailing slash (matches Django routing)
	mux.HandleFunc("/ws/sender/{transfer_id}", transferHandler.HandleSender)
	mux.HandleFunc("/ws/receiver/{transfer_id}", transferHandler.HandleReceiver)

	log.Printf("EcoConnect WebSocket server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
