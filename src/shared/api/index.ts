import {
  ExchangeOrderType,
  InstrumentIdType,
  type InstrumentResponse,
  OrderDirection,
  OrderType,
  type PortfolioPosition,
  type PortfolioResponse,
  type Quotation,
  StopOrderDirection,
  StopOrderExpirationType,
  StopOrderType,
  TTechApiClient,
} from "@tinkoff/invest-js-grpc-web";
import type Long from "long";
import { Currencies, type Money } from "ts-money";

Currencies.RUB = {
  symbol: "₽",
  name: "Rub",
  symbol_native: "₽",
  decimal_digits: 2,
  rounding: 0,
  code: "RUB",
  name_plural: "Russian rubles",
};

import { getInstrumentFromCache, setInstrumentCache } from "./instrumentCache";

export function createApi(token: string) {
  const client = new TTechApiClient({
    token,
    metadata: { "x-app-name": "nanaumov" },
  });

  async function instrumentByUID(uid: string) {
    const cached = getInstrumentFromCache(uid);

    if (cached) return cached;

    const res = await client.instruments.getInstrumentBy({
      idType: 1,
      id: uid,
    });

    setInstrumentCache(uid, res);

    return res;
  }

  return {
    async portfolios() {
      const accounts = await client.users.getAccounts({});

      const result = await Promise.all(
        accounts.accounts.map(async (account) => {
          const portfolio = await client.operations.getPortfolio({
            accountId: account.id,
          });

          const instruments = await Promise.all(
            portfolio.positions.map((p) => instrumentByUID(p.instrumentUid))
          );

          const positions = portfolio.positions.map((position, i) => ({
            accountId: account.id,
            accountName: account.name,
            position,
            instrument: instruments[i],
          }));

          return {
            portfolio,
            positions,
          };
        })
      );

      return result;
    },
  };
}

export type AccountPortfolio = {
  portfolio: PortfolioResponse;
  positions: ExtPosition[];
};
export type ExtPosition = {
  accountId: string;
  accountName: string;
  position: PortfolioPosition;
  instrument: InstrumentResponse;
};

type OrderTypes = "limit" | "market";
type MoneyPrice = Quotation & Money;
type OrderDirections = "buy" | "sell";
type PostOrderParams = {
  orderId: string;
  quantitly: Long;
  instrumentUid: string;
  direction: OrderDirections;
  accountId: string;
};
type LimitPostOrder = { price: MoneyPrice } & PostOrderParams;
type MarketPostOrder = PostOrderParams;
export type PostOrderCommand = LimitPostOrder | MarketPostOrder;

function isLimitPostOrder(cmd: PostOrderCommand): cmd is LimitPostOrder {
  return "price" in (cmd as LimitPostOrder);
}

type StopOrderTypes = "takeProfit" | "stopLoss";
export type StopOrderCommand = {
  instrumentUid: string;
  accountId: string;
  direction: OrderDirections;
  quantitly: Long;
  price: MoneyPrice;
  stopPrice: MoneyPrice;
  stopType: StopOrderTypes;
  tradeOrderType: OrderTypes;
};
