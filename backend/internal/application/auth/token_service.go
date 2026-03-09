package auth

import authdomain "tinvest-portfolio-terminal/backend/internal/domain/auth"

type TokenService struct {
	store authdomain.TokenStore
}

func NewTokenService(store authdomain.TokenStore) *TokenService {
	return &TokenService{store: store}
}

func (s *TokenService) Set(sessionID, token string) {
	s.store.Set(sessionID, token)
}

func (s *TokenService) Get(sessionID string) (string, bool) {
	return s.store.Get(sessionID)
}

func (s *TokenService) Delete(sessionID string) {
	s.store.Delete(sessionID)
}
