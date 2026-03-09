package auth

type TokenStore interface {
	Set(sessionID, token string)
	Get(sessionID string) (string, bool)
	Delete(sessionID string)
}
