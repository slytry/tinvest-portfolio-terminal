package tbank

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	operationsdomain "tinvest-portfolio-terminal/backend/internal/domain/operations"
	portfoliodomain "tinvest-portfolio-terminal/backend/internal/domain/portfolio"
)

const defaultBaseURL = "https://invest-public-api.tinkoff.ru/rest"

type RestClient struct {
	httpClient *http.Client
	baseURL    string
}

func NewRestClient() *RestClient {
	return &RestClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    defaultBaseURL,
	}
}

type rpcAccountsResponse struct {
	Accounts []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"accounts"`
}

type rpcPortfolioResponse struct {
	AccountID             string                              `json:"accountId"`
	ExpectedYield         portfoliodomain.Quotation           `json:"expectedYield"`
	TotalAmountPortfolio  portfoliodomain.MoneyValue          `json:"totalAmountPortfolio"`
	TotalAmountBonds      portfoliodomain.MoneyValue          `json:"totalAmountBonds"`
	TotalAmountShares     portfoliodomain.MoneyValue          `json:"totalAmountShares"`
	TotalAmountEtf        portfoliodomain.MoneyValue          `json:"totalAmountEtf"`
	TotalAmountCurrencies portfoliodomain.MoneyValue          `json:"totalAmountCurrencies"`
	TotalAmountFutures    portfoliodomain.MoneyValue          `json:"totalAmountFutures"`
	Positions             []portfoliodomain.PortfolioPosition `json:"positions"`
}

type rpcInstrumentByResponse struct {
	Instrument portfoliodomain.InstrumentData `json:"instrument"`
}

type rpcOperationsByCursorResponse struct {
	HasNext    bool               `json:"hasNext"`
	NextCursor string             `json:"nextCursor"`
	Items      []rpcOperationItem `json:"items"`
}

type rpcOperationItem struct {
	ID             string                      `json:"id"`
	Date           string                      `json:"date"`
	Type           interface{}                 `json:"type"`
	Name           string                      `json:"name"`
	Description    string                      `json:"description"`
	InstrumentType string                      `json:"instrumentType"`
	Figi           string                      `json:"figi"`
	Payment        *portfoliodomain.MoneyValue `json:"payment"`
	Commission     *portfoliodomain.MoneyValue `json:"commission"`
}

func (c *RestClient) rpcCall(ctx context.Context, token, serviceMethod string, body any, out any) error {
	if strings.TrimSpace(token) == "" {
		return errors.New("API token is empty")
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("%s/%s", c.baseURL, serviceMethod),
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-app-name", "tinvest-portfolio-terminal")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("tbank API error (%d): %s", resp.StatusCode, string(respBody))
	}

	if err := json.Unmarshal(respBody, out); err != nil {
		return fmt.Errorf("invalid tbank API response: %w", err)
	}
	return nil
}

func (c *RestClient) List(ctx context.Context, token string) ([]portfoliodomain.AccountPortfolio, error) {
	var accounts rpcAccountsResponse
	if err := c.rpcCall(ctx, token, "tinkoff.public.invest.api.contract.v1.UsersService/GetAccounts", map[string]any{}, &accounts); err != nil {
		return nil, err
	}

	result := make([]portfoliodomain.AccountPortfolio, 0, len(accounts.Accounts))
	for _, account := range accounts.Accounts {
		var portfolio rpcPortfolioResponse
		if err := c.rpcCall(
			ctx,
			token,
			"tinkoff.public.invest.api.contract.v1.OperationsService/GetPortfolio",
			map[string]any{"accountId": account.ID},
			&portfolio,
		); err != nil {
			return nil, err
		}

		positions := make([]portfoliodomain.ExtPosition, 0, len(portfolio.Positions))
		for _, p := range portfolio.Positions {
			instrument := portfoliodomain.InstrumentResponse{}
			if strings.TrimSpace(p.InstrumentUid) != "" {
				_ = c.rpcCall(
					ctx,
					token,
					"tinkoff.public.invest.api.contract.v1.InstrumentsService/GetInstrumentBy",
					map[string]any{"idType": "INSTRUMENT_ID_TYPE_UID", "id": p.InstrumentUid},
					&instrument,
				)
			}

			positions = append(positions, portfoliodomain.ExtPosition{
				AccountID:   account.ID,
				AccountName: account.Name,
				Position:    p,
				Instrument:  instrument,
			})
		}

		result = append(result, portfoliodomain.AccountPortfolio{
			Portfolio: portfoliodomain.PortfolioResponse{
				AccountID:             portfolio.AccountID,
				ExpectedYield:         portfolio.ExpectedYield,
				TotalAmountPortfolio:  portfolio.TotalAmountPortfolio,
				TotalAmountBonds:      portfolio.TotalAmountBonds,
				TotalAmountShares:     portfolio.TotalAmountShares,
				TotalAmountEtf:        portfolio.TotalAmountEtf,
				TotalAmountCurrencies: portfolio.TotalAmountCurrencies,
				TotalAmountFutures:    portfolio.TotalAmountFutures,
				Positions:             portfolio.Positions,
			},
			Positions: positions,
		})
	}

	return result, nil
}

func toFloat(v *portfoliodomain.MoneyValue) float64 {
	if v == nil {
		return 0
	}
	return float64(v.Units) + float64(v.Nano)/1_000_000_000
}

func classifyOperationType(raw interface{}) operationsdomain.OperationCategory {
	value := strings.ToUpper(fmt.Sprint(raw))

	if strings.Contains(value, "INPUT") {
		return operationsdomain.CategoryDeposit
	}
	if strings.Contains(value, "OUTPUT") {
		return operationsdomain.CategoryWithdraw
	}
	if strings.Contains(value, "FEE") {
		return operationsdomain.CategoryFees
	}
	if strings.Contains(value, "TAX") {
		return operationsdomain.CategoryTaxes
	}
	if strings.Contains(value, "DIV") {
		return operationsdomain.CategoryDividends
	}
	if strings.Contains(value, "COUPON") || strings.Contains(value, "BOND_REPAYMENT") {
		return operationsdomain.CategoryCoupons
	}
	if strings.Contains(value, "BUY") || strings.Contains(value, "SELL") {
		return operationsdomain.CategoryTrades
	}

	return operationsdomain.CategoryOther
}

func stringifyType(raw interface{}) string {
	switch v := raw.(type) {
	case string:
		return v
	case float64:
		return strconv.Itoa(int(v))
	default:
		return fmt.Sprint(v)
	}
}

func (c *RestClient) ListByRange(
	ctx context.Context,
	token string,
	accountIDs []string,
	from, to time.Time,
	maxItems int,
) ([]operationsdomain.HistoryOperation, error) {
	if maxItems <= 0 {
		maxItems = 3000
	}

	all := make([]operationsdomain.HistoryOperation, 0, maxItems)
	for _, accountID := range accountIDs {
		cursor := ""
		hasNext := true

		for hasNext {
			body := map[string]any{
				"accountId":         accountID,
				"from":              from.Format(time.RFC3339),
				"to":                to.Format(time.RFC3339),
				"cursor":            cursor,
				"limit":             500,
				"operationTypes":    []string{},
				"state":             "OPERATION_STATE_EXECUTED",
				"withoutTrades":     false,
				"withoutOvernights": true,
			}

			var resp rpcOperationsByCursorResponse
			if err := c.rpcCall(
				ctx,
				token,
				"tinkoff.public.invest.api.contract.v1.OperationsService/GetOperationsByCursor",
				body,
				&resp,
			); err != nil {
				return nil, err
			}

			for _, item := range resp.Items {
				name := item.Name
				if strings.TrimSpace(name) == "" {
					name = item.Description
				}
				if strings.TrimSpace(name) == "" {
					name = stringifyType(item.Type)
				}

				instrument := "-"
				if strings.TrimSpace(item.InstrumentType) != "" {
					instrument = item.InstrumentType
					if strings.TrimSpace(item.Figi) != "" {
						instrument += " " + item.Figi
					}
				} else if strings.TrimSpace(item.Figi) != "" {
					instrument = item.Figi
				}

				currency := "rub"
				if item.Payment != nil && strings.TrimSpace(item.Payment.Currency) != "" {
					currency = item.Payment.Currency
				}

				all = append(all, operationsdomain.HistoryOperation{
					ID:         item.ID,
					AccountID:  accountID,
					Date:       item.Date,
					Category:   classifyOperationType(item.Type),
					Type:       stringifyType(item.Type),
					Name:       name,
					Instrument: instrument,
					Amount:     toFloat(item.Payment),
					Currency:   currency,
					Commission: abs(toFloat(item.Commission)),
					Tax:        0,
				})

				if len(all) >= maxItems {
					sort.Slice(all, func(i, j int) bool {
						return all[i].Date > all[j].Date
					})
					return all[:maxItems], nil
				}
			}

			hasNext = resp.HasNext && strings.TrimSpace(resp.NextCursor) != ""
			cursor = resp.NextCursor
		}
	}

	sort.Slice(all, func(i, j int) bool {
		return all[i].Date > all[j].Date
	})
	return all, nil
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
