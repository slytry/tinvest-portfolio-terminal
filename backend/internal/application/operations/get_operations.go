package operations

import (
	"context"
	"time"

	operationsdomain "tinvest-portfolio-terminal/backend/internal/domain/operations"
)

type GetOperationsUseCase struct {
	repo operationsdomain.Repository
}

func NewGetOperationsUseCase(repo operationsdomain.Repository) *GetOperationsUseCase {
	return &GetOperationsUseCase{repo: repo}
}

func (uc *GetOperationsUseCase) Execute(ctx context.Context, token string, accountIDs []string, from, to time.Time, maxItems int) ([]operationsdomain.HistoryOperation, error) {
	return uc.repo.ListByRange(ctx, token, accountIDs, from, to, maxItems)
}
