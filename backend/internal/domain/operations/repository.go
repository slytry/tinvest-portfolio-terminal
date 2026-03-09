package operations

import (
	"context"
	"time"
)

type Repository interface {
	ListByRange(ctx context.Context, token string, accountIDs []string, from, to time.Time, maxItems int) ([]HistoryOperation, error)
}
