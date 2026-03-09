package portfolio

type MoneyValue struct {
	Currency string `json:"currency"`
	Units    int64  `json:"units"`
	Nano     int32  `json:"nano"`
}

type Quotation struct {
	Units int64 `json:"units"`
	Nano  int32 `json:"nano"`
}

type PortfolioPosition struct {
	Figi                 string     `json:"figi"`
	InstrumentType       string     `json:"instrumentType"`
	Quantity             Quotation  `json:"quantity"`
	AveragePositionPrice MoneyValue `json:"averagePositionPrice"`
	ExpectedYield        Quotation  `json:"expectedYield"`
	CurrentNkd           MoneyValue `json:"currentNkd"`
	CurrentPrice         MoneyValue `json:"currentPrice"`
	InstrumentUid        string     `json:"instrumentUid"`
}

type PortfolioResponse struct {
	AccountID             string              `json:"accountId"`
	ExpectedYield         Quotation           `json:"expectedYield"`
	TotalAmountPortfolio  MoneyValue          `json:"totalAmountPortfolio"`
	TotalAmountBonds      MoneyValue          `json:"totalAmountBonds"`
	TotalAmountShares     MoneyValue          `json:"totalAmountShares"`
	TotalAmountEtf        MoneyValue          `json:"totalAmountEtf"`
	TotalAmountCurrencies MoneyValue          `json:"totalAmountCurrencies"`
	TotalAmountFutures    MoneyValue          `json:"totalAmountFutures"`
	Positions             []PortfolioPosition `json:"positions"`
}

type InstrumentData struct {
	Name           string `json:"name"`
	Ticker         string `json:"ticker"`
	Isin           string `json:"isin"`
	Currency       string `json:"currency"`
	InstrumentType string `json:"instrumentType"`
	Brand          struct {
		LogoName string `json:"logoName"`
	} `json:"brand"`
}

type InstrumentResponse struct {
	Instrument InstrumentData `json:"instrument"`
}

type ExtPosition struct {
	AccountID   string             `json:"accountId"`
	AccountName string             `json:"accountName"`
	Position    PortfolioPosition  `json:"position"`
	Instrument  InstrumentResponse `json:"instrument"`
}

type AccountPortfolio struct {
	Portfolio PortfolioResponse `json:"portfolio"`
	Positions []ExtPosition     `json:"positions"`
}
