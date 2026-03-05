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

export function createApi(token: string) {
  const client = new TTechApiClient({
    token: token,
    metadata: { "x-app-name": "nanaumov" },
  });

  // кеш в памяти
  const memoryCache = new Map<string, any>();

  // persistent кеш в localStorage
  const LS_KEY = "instrumentCache";

  // загружаем кеш из localStorage
  const persistedCache: Record<string, any> = (() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  async function instrumentByUID(uuid: string) {
    // проверяем memory cache
    if (memoryCache.has(uuid)) return memoryCache.get(uuid);

    // проверяем localStorage
    if (persistedCache[uuid]) {
      memoryCache.set(uuid, persistedCache[uuid]);
      return persistedCache[uuid];
    }

    // если нет — делаем запрос
    const res = await client.instruments.getInstrumentBy({
      idType: InstrumentIdType.INSTRUMENT_ID_TYPE_UID,
      id: uuid,
    });

    // сохраняем в memory cache
    memoryCache.set(uuid, res);

    // сохраняем в localStorage
    if (typeof window !== "undefined") {
      persistedCache[uuid] = res;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(persistedCache));
      } catch {
        // если переполнение localStorage — просто игнорируем
      }
    }

    return res;
  }

  return {
    allInstruments: async () => {
      const shares = await client.instruments.shares({});
      const bonds = await client.instruments.bonds({});
      const etfs = await client.instruments.etfs({});
      return { shares, bonds, etfs };
    },
    portfolios: async () => {
      const accountsResponse = await client.users.getAccounts({});

      const result = (await Promise.all(
        accountsResponse.accounts.map(async (account) => {
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
      )) as AccountPortfolio[];

      return result;
    },
    instrumentByUID: instrumentByUID,
    postOrder: async (cmd: PostOrderCommand) => {
      if (isLimitPostOrder(cmd)) {
        return await client.orders.postOrder({
          orderId: cmd.orderId,
          instrumentId: cmd.instrumentUid,
          accountId: cmd.accountId,
          quantity: cmd.quantitly.toNumber(),
          direction:
            cmd.direction === "buy"
              ? OrderDirection.ORDER_DIRECTION_BUY
              : OrderDirection.ORDER_DIRECTION_SELL,
          orderType: OrderType.ORDER_TYPE_LIMIT,
          price: cmd.price,
        });
      } else {
        return await client.orders.postOrder({
          orderId: cmd.orderId,
          instrumentId: cmd.instrumentUid,
          accountId: cmd.accountId,
          direction:
            cmd.direction === "buy"
              ? OrderDirection.ORDER_DIRECTION_BUY
              : OrderDirection.ORDER_DIRECTION_SELL,
          orderType: OrderType.ORDER_TYPE_MARKET,
          quantity: cmd.quantitly.toNumber(),
        });
      }
    },
    stopOrder: async (cmd: StopOrderCommand) =>
      await client.stopOrders.postStopOrder({
        accountId: cmd.accountId,
        instrumentId: cmd.instrumentUid,
        quantity: cmd.quantitly.toNumber(),
        direction:
          cmd.direction === "buy"
            ? StopOrderDirection.STOP_ORDER_DIRECTION_BUY
            : StopOrderDirection.STOP_ORDER_DIRECTION_SELL,
        price: cmd.price,
        stopPrice: cmd.stopPrice,
        stopOrderType:
          cmd.stopType === "takeProfit"
            ? StopOrderType.STOP_ORDER_TYPE_TAKE_PROFIT
            : StopOrderType.STOP_ORDER_TYPE_STOP_LOSS,
        exchangeOrderType: ExchangeOrderType.EXCHANGE_ORDER_TYPE_LIMIT,
        expirationType:
          StopOrderExpirationType.STOP_ORDER_EXPIRATION_TYPE_GOOD_TILL_CANCEL,
      }),
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
