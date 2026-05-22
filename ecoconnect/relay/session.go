package relay

import (
	"sync"
	"time"
)

// Session holds everything shared between a sender and receiver for one transfer.
type Session struct {
	TransferID   string
	Buffer       *TransferBuffer
	CreatedAt    time.Time
	LastActivity time.Time

	mu       sync.RWMutex
	sender   *SenderHandler
	receiver *ReceiverHandler
}

func newSession(id string) *Session {
	return &Session{
		TransferID:   id,
		Buffer:       NewTransferBuffer(id, 64),
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
	}
}

func (s *Session) SetSender(sh *SenderHandler) {
	s.mu.Lock()
	s.sender = sh
	s.LastActivity = time.Now()
	s.mu.Unlock()
}

func (s *Session) SetReceiver(rh *ReceiverHandler) {
	s.mu.Lock()
	s.receiver = rh
	s.LastActivity = time.Now()
	s.mu.Unlock()
}

func (s *Session) GetSender() *SenderHandler {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sender
}

func (s *Session) GetReceiver() *ReceiverHandler {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.receiver
}

func (s *Session) touch() {
	s.mu.Lock()
	s.LastActivity = time.Now()
	s.mu.Unlock()
}

func (s *Session) isStale(timeout time.Duration) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return time.Since(s.LastActivity) > timeout
}

// SessionManager is a global registry of active transfer sessions.
type SessionManager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

var GlobalSessions = &SessionManager{
	sessions: make(map[string]*Session),
}

func (m *SessionManager) GetOrCreate(id string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.sessions[id]; ok {
		s.touch()
		return s
	}
	s := newSession(id)
	m.sessions[id] = s
	return s
}

func (m *SessionManager) Get(id string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sessions[id]
	return s, ok
}

func (m *SessionManager) Remove(id string) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	if ok {
		delete(m.sessions, id)
	}
	m.mu.Unlock()

	if ok {
		s.Buffer.Finish()
	}
}

// StartCleanup removes sessions idle for more than 5 minutes.
func (m *SessionManager) StartCleanup() {
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			m.mu.RLock()
			var stale []string
			for id, s := range m.sessions {
				if s.isStale(5 * time.Minute) {
					stale = append(stale, id)
				}
			}
			m.mu.RUnlock()

			for _, id := range stale {
				m.Remove(id)
			}
		}
	}()
}
