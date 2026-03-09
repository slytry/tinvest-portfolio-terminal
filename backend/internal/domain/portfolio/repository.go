package portfolio

import "context"

type Repository interface {
	List(ctx context.Context, token string) ([]AccountPortfolio, error)
}
