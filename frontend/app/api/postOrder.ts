import {
	ExchangeOrderType,
	OrderDirection,
	OrderType,
	type Quotation,
	StopOrderDirection,
	StopOrderExpirationType,
	StopOrderType,
	type TTechApiClient,
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

const orders = (client: TTechApiClient) => {
	return {
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
};
