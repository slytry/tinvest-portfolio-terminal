package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	authapp "tinvest-portfolio-terminal/backend/internal/application/auth"
	operationsapp "tinvest-portfolio-terminal/backend/internal/application/operations"
	portfolioapp "tinvest-portfolio-terminal/backend/internal/application/portfolio"
)

type Handler struct {
	tokens     *authapp.TokenService
	portfolios *portfolioapp.GetPortfoliosUseCase
	operations *operationsapp.GetOperationsUseCase
}

func NewHandler(
	tokens *authapp.TokenService,
	portfolios *portfolioapp.GetPortfoliosUseCase,
	operations *operationsapp.GetOperationsUseCase,
) *Handler {
	return &Handler{tokens: tokens, portfolios: portfolios, operations: operations}
}

type tokenRequest struct {
	Token string `json:"token"`
}

func (h *Handler) saveToken(w http.ResponseWriter, r *http.Request) {
	sid := ensureSessionID(w, r)
	var req tokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		http.Error(w, "invalid token payload", http.StatusBadRequest)
		return
	}
	h.tokens.Set(sid, strings.TrimSpace(req.Token))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) tokenStatus(w http.ResponseWriter, r *http.Request) {
	sid := ensureSessionID(w, r)
	_, ok := h.tokens.Get(sid)
	writeJSON(w, http.StatusOK, map[string]bool{"hasToken": ok})
}

func (h *Handler) deleteToken(w http.ResponseWriter, r *http.Request) {
	sid := ensureSessionID(w, r)
	h.tokens.Delete(sid)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) getPortfolios(w http.ResponseWriter, r *http.Request) {
	token, err := h.getToken(r, w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	result, err := h.portfolios.Execute(r.Context(), token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) getOperations(w http.ResponseWriter, r *http.Request) {
	token, err := h.getToken(r, w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	q := r.URL.Query()
	ids := splitCSV(q.Get("accountIds"))
	if len(ids) == 0 {
		writeJSON(w, http.StatusOK, []any{})
		return
	}

	from, err := time.Parse(time.RFC3339, q.Get("from"))
	if err != nil {
		http.Error(w, "invalid from", http.StatusBadRequest)
		return
	}
	to, err := time.Parse(time.RFC3339, q.Get("to"))
	if err != nil {
		http.Error(w, "invalid to", http.StatusBadRequest)
		return
	}

	maxItems := 3000
	if raw := q.Get("maxItems"); raw != "" {
		if parsed, parseErr := parsePositiveInt(raw); parseErr == nil {
			maxItems = parsed
		}
	}

	result, err := h.operations.Execute(r.Context(), token, ids, from, to, maxItems)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) getToken(r *http.Request, w http.ResponseWriter) (string, error) {
	sid := ensureSessionID(w, r)
	token, ok := h.tokens.Get(sid)
	if !ok || strings.TrimSpace(token) == "" {
		return "", errors.New("API token is not configured")
	}
	return token, nil
}

func splitCSV(input string) []string {
	parts := strings.Split(input, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func parsePositiveInt(raw string) (int, error) {
	var n int
	_, err := fmt.Sscanf(raw, "%d", &n)
	if err != nil || n <= 0 {
		return 0, errors.New("invalid number")
	}
	return n, nil
}
