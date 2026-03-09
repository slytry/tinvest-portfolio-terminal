import { action, atom, computed, wrap } from "@reatom/core";
import { savePortfolioSnapshots } from "~/features/history/lib/snapshots";
import { bondsMapAtom, fetchBonds } from "./bonds/store";

export type MoneyValue = {
	currency: string;
	units: number;
	nano: number;
};

export type Quotation = {
	units: number;
	nano: number;
};

export type PortfolioPosition = {
	figi: string;
	instrumentType: string;
	quantity: Quotation;
	averagePositionPrice: MoneyValue;
	expectedYield: Quotation;
	currentNkd: MoneyValue;
	currentPrice: MoneyValue;
	instrumentUid: string;
};

export type PortfolioResponse = {
	accountId: string;
	expectedYield: Quotation;
	totalAmountPortfolio: MoneyValue;
	totalAmountBonds: MoneyValue;
	totalAmountShares: MoneyValue;
	totalAmountEtf: MoneyValue;
	totalAmountCurrencies: MoneyValue;
	totalAmountFutures: MoneyValue;
	positions: PortfolioPosition[];
};

export type InstrumentResponse = {
	instrument: {
		name: string;
		ticker: string;
		isin: string;
		currency: string;
		instrumentType: string;
		brand?: {
			logoName?: string;
		};
	};
};

export type ExtPosition = {
	accountId: string;
	accountName: string;
	position: PortfolioPosition;
	instrument: InstrumentResponse;
	bondRating?: string;
	bondYtm?: number;
	bondMaturity?: string;
	bondData?: unknown;
};

export type AccountPortfolio = {
	portfolio: PortfolioResponse;
	positions: ExtPosition[];
};

type PortfoliosState = {
	data: AccountPortfolio[] | null;
	isLoading: boolean;
	error: string | null;
	isEnriched: boolean;
};

const fetchJSON = async <T>(url: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(url, {
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		...init,
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `Request failed: ${response.status}`);
	}

	return (await response.json()) as T;
};

export const portfolios = async (): Promise<AccountPortfolio[]> => {
	return fetchJSON<AccountPortfolio[]>("/api/v1/portfolios");
};

export const portfoliosModel = atom<PortfoliosState>(
	{
		data: null,
		isLoading: true,
		error: null,
		isEnriched: false,
	},
	"portfoliosModel",
).extend((target) => {
	const enrichWithBondsData = action(() => {
		const items = target().data;
		const bondsMap = bondsMapAtom();

		if (!items || !bondsMap) return;

		const enrichedPortfolios = items.map((portfolio) => ({
			...portfolio,
			positions: portfolio.positions.map((position) => {
				if (position.instrument.instrument?.instrumentType !== "bond") {
					return position;
				}

				const bondData =
					bondsMap[position.instrument.instrument?.isin || ""] ||
					bondsMap[position.instrument.instrument?.name || ""];

				if (!bondData) return position;

				return {
					...position,
					bondRating: bondData.creditRating,
					bondYtm: bondData.ytm,
					bondMaturity: bondData.maturityDate,
					bondData,
				};
			}),
		}));

		target.set((state) => ({
			...state,
			data: enrichedPortfolios,
			isEnriched: true,
		}));
	}, "portfoliosModel.enrichWithBondsData");

	const fetchPortfoliosData = action(async () => {
		target.set((state) => ({
			...state,
			isLoading: true,
			error: null,
			isEnriched: false,
		}));

		try {
			const response = await wrap(portfolios());
			target.set((state) => ({ ...state, data: response }));
			savePortfolioSnapshots(response);

			await wrap(fetchBonds());
			enrichWithBondsData();
		} catch (error) {
			target.set((state) => ({
				...state,
				error:
					error instanceof Error ? error.message : "Failed to fetch portfolios",
			}));
		} finally {
			target.set((state) => ({ ...state, isLoading: false }));
		}
	}, "portfoliosModel.fetch");

	return { enrichWithBondsData, fetch: fetchPortfoliosData };
});

export const portfoliosAtom = computed(() => portfoliosModel().data, "portfoliosAtom");
export const portfoliosIsLoadingAtom = computed(
	() => portfoliosModel().isLoading,
	"portfoliosIsLoadingAtom",
);
export const portfoliosErrorAtom = computed(
	() => portfoliosModel().error,
	"portfoliosErrorAtom",
);
export const portfoliosIsEnrichedAtom = computed(
	() => portfoliosModel().isEnriched,
	"portfoliosIsEnrichedAtom",
);

export const fetchPortfolios = portfoliosModel.fetch;
export const enrichWithBondsData = portfoliosModel.enrichWithBondsData;

export const allPositionsAtom = computed(() => {
	const data = portfoliosModel().data;
	if (!data) return [];

	return data.flatMap((p) => p.positions);
}, "allPositionsAtom");
