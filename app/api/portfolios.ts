import type {
	InstrumentResponse,
	PortfolioPosition,
	PortfolioResponse,
} from "@tinkoff/invest-js-grpc-web";
import { create } from "zustand";
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
};

export const portfolios = async (): Promise<AccountPortfolio[]> => {
	const accountsResponse = await api.users.getAccounts({});

	const result = await Promise.all(
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

	return result;
};

type PortfolioState = {
	portfolios: AccountPortfolio[] | null;
	isLoading: boolean;
	error: string | null;
};

type PortfolioActions = {
	fetchPortfolios: () => Promise<void>;
};

type PortfolioStore = PortfolioState & PortfolioActions;

export const usePortfoliosStore = create<PortfolioStore>((set) => ({
	portfolios: null,
	isLoading: true,
	error: null,

	fetchPortfolios: async () => {
		set({ isLoading: true, error: null });
		try {
			const response = await portfolios();
			set({ portfolios: response, isLoading: false });
		} catch (error) {
			set({
				error:
					error instanceof Error ? error.message : "Failed to fetch portfolios",
				isLoading: false,
			});
		}
	},
}));
