import {
	OperationState,
	OperationType,
	type OperationItem,
} from "@tinkoff/invest-js-grpc-web";
import { api } from "./client";

export type HistoryPeriodPreset =
	| "1d"
	| "1w"
	| "1m"
	| "6m"
	| "1y"
	| "all"
	| "custom";
export type HistoryDisplayType = "value" | "pnl" | "return";

export type OperationCategory =
	| "deposit"
	| "withdraw"
	| "fees"
	| "taxes"
	| "dividends"
	| "coupons"
	| "trades"
	| "other";

export type HistoryOperation = {
	id: string;
	accountId: string;
	date: string;
	category: OperationCategory;
	type: OperationType;
	name: string;
	instrument: string;
	amount: number;
	currency: string;
	commission: number;
	tax: number;
};

const moneyToNumber = (value?: { units: number; nano: number } | null) => {
	if (!value) return 0;
	return value.units + value.nano / 1_000_000_000;
};

const DEPOSIT_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_INPUT,
	OperationType.OPERATION_TYPE_INPUT_ACQUIRING,
	OperationType.OPERATION_TYPE_INPUT_SWIFT,
]);

const WITHDRAW_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_OUTPUT,
	OperationType.OPERATION_TYPE_OUTPUT_ACQUIRING,
	OperationType.OPERATION_TYPE_OUTPUT_SWIFT,
]);

const FEE_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_SERVICE_FEE,
	OperationType.OPERATION_TYPE_MARGIN_FEE,
	OperationType.OPERATION_TYPE_BROKER_FEE,
	OperationType.OPERATION_TYPE_SUCCESS_FEE,
	OperationType.OPERATION_TYPE_OUT_FEE,
	OperationType.OPERATION_TYPE_CASH_FEE,
	OperationType.OPERATION_TYPE_TRACK_MFEE,
	OperationType.OPERATION_TYPE_TRACK_PFEE,
]);

const TAX_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_TAX,
	OperationType.OPERATION_TYPE_BOND_TAX,
	OperationType.OPERATION_TYPE_DIVIDEND_TAX,
	OperationType.OPERATION_TYPE_TAX_PROGRESSIVE,
	OperationType.OPERATION_TYPE_BOND_TAX_PROGRESSIVE,
	OperationType.OPERATION_TYPE_DIVIDEND_TAX_PROGRESSIVE,
	OperationType.OPERATION_TYPE_TAX_CORRECTION,
	OperationType.OPERATION_TYPE_TAX_CORRECTION_PROGRESSIVE,
	OperationType.OPERATION_TYPE_TAX_CORRECTION_COUPON,
]);

const DIV_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_DIVIDEND,
	OperationType.OPERATION_TYPE_DIV_EXT,
	OperationType.OPERATION_TYPE_DIVIDEND_TRANSFER,
]);

const COUPON_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_COUPON,
	OperationType.OPERATION_TYPE_BOND_REPAYMENT,
	OperationType.OPERATION_TYPE_BOND_REPAYMENT_FULL,
]);

const TRADE_TYPES = new Set<OperationType>([
	OperationType.OPERATION_TYPE_BUY,
	OperationType.OPERATION_TYPE_SELL,
	OperationType.OPERATION_TYPE_BUY_CARD,
	OperationType.OPERATION_TYPE_SELL_CARD,
	OperationType.OPERATION_TYPE_BUY_MARGIN,
	OperationType.OPERATION_TYPE_SELL_MARGIN,
]);

export const classifyOperation = (type: OperationType): OperationCategory => {
	if (DEPOSIT_TYPES.has(type)) return "deposit";
	if (WITHDRAW_TYPES.has(type)) return "withdraw";
	if (FEE_TYPES.has(type)) return "fees";
	if (TAX_TYPES.has(type)) return "taxes";
	if (DIV_TYPES.has(type)) return "dividends";
	if (COUPON_TYPES.has(type)) return "coupons";
	if (TRADE_TYPES.has(type)) return "trades";
	return "other";
};

const mapOperation = (accountId: string, item: OperationItem): HistoryOperation => ({
	id: item.id,
	accountId,
	date: (item.date || new Date()).toISOString(),
	category: classifyOperation(item.type),
	type: item.type,
	name: item.name || item.description || String(item.type),
	instrument: item.instrumentType
		? `${item.instrumentType}${item.figi ? ` ${item.figi}` : ""}`
		: item.figi || "-",
	amount: moneyToNumber(item.payment),
	currency: item.payment?.currency || "rub",
	commission: Math.abs(moneyToNumber(item.commission)),
	tax: 0,
});

export const fetchOperationsByCursorAll = async (
	accountIds: string[],
	from: Date,
	to: Date,
	maxItems = 3000,
) => {
	const all: HistoryOperation[] = [];

	for (const accountId of accountIds) {
		let cursor = "";
		let hasNext = true;

		while (hasNext) {
			const res = await api.operations.getOperationsByCursor({
				accountId,
				from,
				to,
				cursor,
				limit: 500,
				operationTypes: [],
				state: OperationState.OPERATION_STATE_EXECUTED,
				withoutTrades: false,
				withoutOvernights: true,
			});

			all.push(...res.items.map((item) => mapOperation(accountId, item)));
			if (all.length >= maxItems) {
				return all
					.slice(0, maxItems)
					.sort((a, b) => b.date.localeCompare(a.date));
			}
			hasNext = res.hasNext;
			cursor = res.nextCursor || "";

			if (!res.nextCursor) break;
		}
	}

	return all.sort((a, b) => b.date.localeCompare(a.date));
};

export const periodFromPreset = (preset: HistoryPeriodPreset) => {
	const to = new Date();
	const from = new Date(to);

	switch (preset) {
		case "1d":
			from.setDate(to.getDate() - 1);
			break;
		case "1w":
			from.setDate(to.getDate() - 7);
			break;
		case "1m":
			from.setMonth(to.getMonth() - 1);
			break;
		case "6m":
			from.setMonth(to.getMonth() - 6);
			break;
		case "1y":
			from.setFullYear(to.getFullYear() - 1);
			break;
		case "all":
			from.setFullYear(2000, 0, 1);
			from.setHours(0, 0, 0, 0);
			break;
		default:
			from.setMonth(to.getMonth() - 1);
	}

	return { from, to };
};
