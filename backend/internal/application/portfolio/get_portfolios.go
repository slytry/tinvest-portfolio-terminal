package portfolio

import (
	"context"

	portfoliodomain "tinvest-portfolio-terminal/backend/internal/domain/portfolio"
)

type GetPortfoliosUseCase struct {
	repo portfoliodomain.Repository
}

func NewGetPortfoliosUseCase(repo portfoliodomain.Repository) *GetPortfoliosUseCase {
	return &GetPortfoliosUseCase{repo: repo}
}

func (uc *GetPortfoliosUseCase) Execute(ctx context.Context, token string) ([]portfoliodomain.AccountPortfolio, error) {
	return uc.repo.List(ctx, token)
}
