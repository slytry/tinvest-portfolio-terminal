package operations

type OperationCategory string

const (
	CategoryDeposit   OperationCategory = "deposit"
	CategoryWithdraw  OperationCategory = "withdraw"
	CategoryFees      OperationCategory = "fees"
	CategoryTaxes     OperationCategory = "taxes"
	CategoryDividends OperationCategory = "dividends"
	CategoryCoupons   OperationCategory = "coupons"
	CategoryTrades    OperationCategory = "trades"
	CategoryOther     OperationCategory = "other"
)

type HistoryOperation struct {
	ID         string            `json:"id"`
	AccountID  string            `json:"accountId"`
	Date       string            `json:"date"`
	Category   OperationCategory `json:"category"`
	Type       string            `json:"type"`
	Name       string            `json:"name"`
	Instrument string            `json:"instrument"`
	Amount     float64           `json:"amount"`
	Currency   string            `json:"currency"`
	Commission float64           `json:"commission"`
	Tax        float64           `json:"tax"`
}
