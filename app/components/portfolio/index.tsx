import type { PortfolioResponse } from "@tinkoff/invest-js-grpc-web";
import { useMemo, useState } from "react";
import type { AccountPortfolio } from "~/shared/api";

type Props = {
  portfolios: PortfolioResponse[];
  title?: string;
  showSummaryCards?: boolean;
};

export const PortfolioViewer = ({
  portfolios,
  title = "Инвестиционные портфели",
  showSummaryCards = true,
}: Props) => {
  const [selectedPortfolios, setSelectedPortfolios] = useState<string[]>([]);
  const [expandedPortfolio, setExpandedPortfolio] = useState<string | null>(
    null
  );

  const handlePortfolioSelect = (accountId: string) => {
    setSelectedPortfolios((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPortfolios(
      selectedPortfolios.length === portfolios.length
        ? []
        : portfolios.map((p) => p.portfolio.accountId)
    );
  };

  const formatAmount = (amount: any, currency = "rub") => {
    if (!amount) return "0 ₽";
    const value = (amount.units || 0) + (amount.nano || 0) / 1e9;
    const formattedValue = value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const currencySymbol =
      currency === "rub" ? "₽" : currency === "usd" ? "$" : currency;
    return `${formattedValue} ${currencySymbol}`;
  };

  const formatYield = (yieldObj: any) => {
    if (!yieldObj) return "0";
    const value = (yieldObj.units || 0) + (yieldObj.nano || 0) / 1e9;
    return value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getPortfolioName = (portfolioData: any) => {
    const positions = portfolioData.positions || [];
    if (positions.length && positions[0].accountName) {
      return positions[0].accountName;
    }
    return `Портфель ${portfolioData.portfolio.accountId.slice(-4)}`;
  };

  const filteredPortfolios = useMemo(
    () =>
      portfolios.filter((p) =>
        selectedPortfolios.includes(p.portfolio.accountId)
      ),
    [portfolios, selectedPortfolios]
  );

  const totalValue = useMemo(() => {
    return filteredPortfolios.reduce((sum, p) => {
      const amt = p.portfolio.totalAmountPortfolio;
      return sum + ((amt.units || 0) + (amt.nano || 0) / 1e9);
    }, 0);
  }, [filteredPortfolios]);

  const totalDailyYield = useMemo(() => {
    return filteredPortfolios.reduce((sum, p) => {
      const yld = p.portfolio.dailyYield;
      return sum + ((yld.units || 0) + (yld.nano || 0) / 1e9);
    }, 0);
  }, [filteredPortfolios]);

  const togglePortfolio = (accountId: string) => {
    setExpandedPortfolio(expandedPortfolio === accountId ? null : accountId);
  };

  return (
    <div className="portfolio-viewer">
      <div className="portfolio-viewer__header">
        <h1>{title}</h1>
        {portfolios.length > 0 && (
          <button onClick={handleSelectAll}>
            {selectedPortfolios.length === portfolios.length
              ? "Снять все"
              : "Выбрать все"}
          </button>
        )}
      </div>

      <div className="portfolio-viewer__selector">
        <h2>Выберите портфели для просмотра:</h2>
        <div className="portfolio-viewer__checkbox-group">
          {portfolios.map((p) => {
            const accountId = p.portfolio.accountId;
            return (
              <label
                className={`portfolio-viewer__checkbox-item ${
                  selectedPortfolios.includes(accountId) ? "selected" : ""
                }`}
                key={accountId}
              >
                <input
                  checked={selectedPortfolios.includes(accountId)}
                  onChange={() => handlePortfolioSelect(accountId)}
                  type="checkbox"
                />
                <span>{getPortfolioName(p)}</span>
                <span>{formatAmount(p.portfolio.totalAmountPortfolio)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {showSummaryCards && selectedPortfolios.length > 0 && (
        <div className="portfolio-viewer__summary">
          <h2>Сводная информация</h2>
          <div className="portfolio-viewer__summary-cards">
            <div>
              <div>Выбрано портфелей</div>
              <div>{selectedPortfolios.length}</div>
            </div>
            <div>
              <div>Общая стоимость</div>
              <div>
                {totalValue.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₽
              </div>
            </div>
            <div>
              <div>Дневная доходность</div>
              <div className={totalDailyYield >= 0 ? "positive" : "negative"}>
                {totalDailyYield.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₽
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="portfolio-viewer__details">
        <h2>Детальная информация</h2>
        {filteredPortfolios.length === 0 ? (
          <div>Выберите портфели для отображения детальной информации</div>
        ) : (
          filteredPortfolios.map((p) => {
            const { portfolio, positions } = p;
            const accountId = portfolio.accountId;
            const isExpanded = expandedPortfolio === accountId;
            return (
              <div className="portfolio-viewer__detail-card" key={accountId}>
                <div
                  className="portfolio-viewer__detail-header"
                  onClick={() => togglePortfolio(accountId)}
                >
                  <div>
                    <h3>{getPortfolioName(p)}</h3>
                    <div>{accountId}</div>
                  </div>
                  <div>
                    <span>{formatAmount(portfolio.totalAmountPortfolio)}</span>
                    <span
                      className={
                        portfolio.dailyYield.units +
                          portfolio.dailyYield.nano / 1e9 >=
                        0
                          ? "positive"
                          : "negative"
                      }
                    >
                      {formatAmount(portfolio.dailyYield)}
                    </span>
                    <span>{isExpanded ? "▼" : "▶"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="portfolio-viewer__detail-content">
                    <div className="portfolio-viewer__category-summary">
                      <div>
                        Акции: {formatAmount(portfolio.totalAmountShares)}
                      </div>
                      <div>
                        Облигации: {formatAmount(portfolio.totalAmountBonds)}
                      </div>
                      <div>Фонды: {formatAmount(portfolio.totalAmountEtf)}</div>
                      <div>
                        Валюта: {formatAmount(portfolio.totalAmountCurrencies)}
                      </div>
                      <div>
                        Фьючерсы: {formatAmount(portfolio.totalAmountFutures)}
                      </div>
                      <div
                        className={
                          portfolio.expectedYield.units >= 0
                            ? "positive"
                            : "negative"
                        }
                      >
                        Ожидаемая доходность:{" "}
                        {formatYield(portfolio.expectedYield)} ₽
                      </div>
                    </div>

                    {positions?.length > 0 && (
                      <table>
                        <thead>
                          <tr>
                            <th>Инструмент</th>
                            <th>Тип</th>
                            <th>Количество</th>
                            <th>Средняя цена</th>
                            <th>Текущая цена</th>
                            <th>Доходность</th>
                            <th>НКД</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map((item, idx) => {
                            const pos = item.position;
                            const instr = item.instrument?.instrument;
                            const name = instr?.name || pos.figi;
                            const yieldValue =
                              (pos.expectedYield?.units || 0) +
                              (pos.expectedYield?.nano || 0) / 1e9;

                            return (
                              <tr key={`${pos.figi}-${idx}`}>
                                <td title={name}>
                                  {name.length > 30
                                    ? name.slice(0, 30) + "..."
                                    : name}
                                </td>
                                <td>{pos.instrumentType}</td>
                                <td>
                                  {(pos.quantity?.units || 0).toLocaleString()}
                                </td>
                                <td>
                                  {formatAmount(pos.averagePositionPrice)}
                                </td>
                                <td>{formatAmount(pos.currentPrice)}</td>
                                <td
                                  className={
                                    yieldValue >= 0 ? "positive" : "negative"
                                  }
                                >
                                  {yieldValue.toLocaleString("ru-RU", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  ₽
                                </td>
                                <td>
                                  {pos.currentNkd
                                    ? formatAmount(pos.currentNkd)
                                    : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
