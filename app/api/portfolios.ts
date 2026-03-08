import { action, atom, computed, wrap } from "@reatom/core";
import type {
	InstrumentResponse,
	PortfolioPosition,
	PortfolioResponse,
} from "@tinkoff/invest-js-grpc-web";
import { savePortfolioSnapshots } from "~/features/history/lib/snapshots";
import { bondsMapAtom, fetchBonds } from "./bonds/store";
import { api } from "./client";
import { instrumentByUID } from "./instrumentByUID";

export type AccountPortfolio = {
	portfolio: PortfolioResponse;
	positions: ExtPosition[];
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

type PortfoliosState = {
	data: AccountPortfolio[] | null;
	isLoading: boolean;
	error: string | null;
	isEnriched: boolean;
};

export const portfolios = async (): Promise<AccountPortfolio[]> => {
	const accountsResponse = await api.users.getAccounts({});

	return Promise.all(
		accountsResponse.accounts.map(async (account) => {
			const portfolio = await api.operations.getPortfolio({
				accountId: account.id,
			});
			const instruments = await Promise.all(
				portfolio.positions.map((p) => instrumentByUID(p.instrumentUid)),
			);
			const positions = portfolio.positions.map((position, i) => ({
				accountId: account.id,
				accountName: account.name,
				position,
				instrument: instruments[i],
			}));

			return { portfolio, positions };
		}),
	);
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

	const fetch = action(async () => {
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

	return { enrichWithBondsData, fetch };
});

export const portfoliosAtom = computed(
	() => portfoliosModel().data,
	"portfoliosAtom",
);
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
