package memory

import "sync"

type TokenStore struct {
	mu     sync.RWMutex
	tokens map[string]string
}

func NewTokenStore() *TokenStore {
	return &TokenStore{tokens: map[string]string{}}
}

func (s *TokenStore) Set(sessionID, token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[sessionID] = token
}

func (s *TokenStore) Get(sessionID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.tokens[sessionID]
	return t, ok
}

func (s *TokenStore) Delete(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tokens, sessionID)
}
