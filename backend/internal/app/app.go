package app

import (
	"net/http"

	authapp "tinvest-portfolio-terminal/backend/internal/application/auth"
	operationsapp "tinvest-portfolio-terminal/backend/internal/application/operations"
	portfolioapp "tinvest-portfolio-terminal/backend/internal/application/portfolio"
	"tinvest-portfolio-terminal/backend/internal/infrastructure/memory"
	"tinvest-portfolio-terminal/backend/internal/infrastructure/tbank"
	httpiface "tinvest-portfolio-terminal/backend/internal/interfaces/http"
)

func NewHTTPHandler() http.Handler {
	tokenStore := memory.NewTokenStore()
	tokenService := authapp.NewTokenService(tokenStore)

	client := tbank.NewRestClient()
	portfoliosUC := portfolioapp.NewGetPortfoliosUseCase(client)
	operationsUC := operationsapp.NewGetOperationsUseCase(client)

	handler := httpiface.NewHandler(tokenService, portfoliosUC, operationsUC)
	return httpiface.NewRouter(handler)
}
