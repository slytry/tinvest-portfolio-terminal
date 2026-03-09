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
	type: string;
	name: string;
	instrument: string;
	amount: number;
	currency: string;
	commission: number;
	tax: number;
};

const fetchJSON = async <T>(url: string): Promise<T> => {
	const response = await fetch(url, {
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `Request failed: ${response.status}`);
	}

	return (await response.json()) as T;
};

export const fetchOperationsByCursorAll = async (
	accountIds: string[],
	from: Date,
	to: Date,
	maxItems = 3000,
) => {
	const params = new URLSearchParams({
		accountIds: accountIds.join(","),
		from: from.toISOString(),
		to: to.toISOString(),
		maxItems: String(maxItems),
	});

	return fetchJSON<HistoryOperation[]>(`/api/v1/operations?${params.toString()}`);
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
