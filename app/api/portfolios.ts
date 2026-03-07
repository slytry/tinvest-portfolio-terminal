import type {
	InstrumentResponse,
	PortfolioPosition,
	PortfolioResponse,
} from "@tinkoff/invest-js-grpc-web";
import { action, atom, computed, wrap } from "@reatom/core";
import {
	bondsMapAtom,
	fetchBonds,
} from "./bonds/store";
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

export const portfoliosAtom = atom<AccountPortfolio[] | null>(null, "portfoliosAtom");
export const portfoliosIsLoadingAtom = atom(true, "portfoliosIsLoadingAtom");
export const portfoliosErrorAtom = atom<string | null>(null, "portfoliosErrorAtom");
export const portfoliosIsEnrichedAtom = atom(false, "portfoliosIsEnrichedAtom");

export const enrichWithBondsData = action(() => {
	const items = portfoliosAtom();
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

	portfoliosAtom.set(enrichedPortfolios);
	portfoliosIsEnrichedAtom.set(true);
}, "enrichWithBondsData");

export const fetchPortfolios = action(async () => {
	portfoliosIsLoadingAtom.set(true);
	portfoliosErrorAtom.set(null);
	portfoliosIsEnrichedAtom.set(false);

	try {
		const response = await wrap(portfolios());
		portfoliosAtom.set(response);

		await wrap(fetchBonds());
		enrichWithBondsData();
	} catch (error) {
		portfoliosErrorAtom.set(
			error instanceof Error ? error.message : "Failed to fetch portfolios",
		);
	} finally {
		portfoliosIsLoadingAtom.set(false);
	}
}, "fetchPortfolios");

export const allPositionsAtom = computed(() => {
	const data = portfoliosAtom();
	if (!data) return [];

	return data.flatMap((p) => p.positions);
}, "allPositionsAtom");
