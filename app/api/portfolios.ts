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

const getAccounts = () => {
	const accs = [
		{
			id: "2186762886",
			type: 1,
			name: "HOMD",
			status: 2,
			openedDate: "2024-09-03T00:00:00.000Z",
			closedDate: "1970-01-01T00:00:00.000Z",
			accessLevel: 2,
		},
		{
			id: "2160418950",
			type: 2,
			name: "PENSION_IIS",
			status: 2,
			openedDate: "2024-05-17T00:00:00.000Z",
			closedDate: "1970-01-01T00:00:00.000Z",
			accessLevel: 2,
		},
	];

	// const accountsResponse = await client.users.getAccounts({});

	return accs;
};

export const portfolios = async (): Promise<AccountPortfolio[]> => {
	const result = await Promise.all(
		getAccounts().map(async (account) => {
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
