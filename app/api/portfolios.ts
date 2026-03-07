import type {
	InstrumentResponse,
	PortfolioPosition,
	PortfolioResponse,
} from "@tinkoff/invest-js-grpc-web";
import { create } from "zustand";
import { api } from "./client";
import { instrumentByUID } from "./instrumentByUID";
import { useBondsStore } from "./bonds/store";


export type AccountPortfolio = {
	portfolio: PortfolioResponse;
	positions: ExtPosition[];
};

export type ExtPosition = {
	accountId: string;
	accountName: string;
	position: PortfolioPosition;
	instrument: InstrumentResponse;
	// Добавляем поля для облигаций
	bondRating?: string;
	bondYtm?: number;
	bondMaturity?: string;
	bondData?: any;
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
	// Добавляем флаг, что данные обогащены
	isEnriched: boolean;
};

type PortfolioActions = {
	fetchPortfolios: () => Promise<void>;
	// Новый метод для обогащения данных облигациями
	enrichWithBondsData: () => Promise<void>;
};

type PortfolioStore = PortfolioState & PortfolioActions;

export const usePortfoliosStore = create<PortfolioStore>((set, get) => ({
	portfolios: null,
	isLoading: true,
	error: null,
	isEnriched: false,

	fetchPortfolios: async () => {
		set({ isLoading: true, error: null, isEnriched: false });
		try {
			const response = await portfolios();
			set({ portfolios: response, isLoading: false });

			// Автоматически загружаем данные облигаций
			const bondsStore = useBondsStore.getState();
			await bondsStore.fetchBonds();

			// Обогащаем данные
			get().enrichWithBondsData();

		} catch (error) {
			set({
				error:
					error instanceof Error ? error.message : "Failed to fetch portfolios",
				isLoading: false,
			});
		}
	},

	enrichWithBondsData: async () => {
		const { portfolios } = get();
		const bondsStore = useBondsStore.getState();

		if (!portfolios || !bondsStore.bondsMap) return;

		// Обогащаем каждую позицию
		const enrichedPortfolios = portfolios.map(portfolio => ({
			...portfolio,
			positions: portfolio.positions.map(position => {
				if (position.instrument.instrument?.instrumentType !== 'bond') {
					return position;
				}

				const bondData = bondsStore.getBondByIsin(
					position.instrument.instrument?.isin || ''
				) || bondsStore.getBondByName(
					position.instrument.instrument?.name || ''
				);

				if (bondData) {
					return {
						...position,
						bondRating: bondData.creditRating,
						bondYtm: bondData.ytm,
						bondMaturity: bondData.maturityDate,
						bondData,
					};
				}

				return position;
			}),
		}));

		set({ portfolios: enrichedPortfolios, isEnriched: true });
	},
}));

// Хук для получения обогащенных позиций
export const useEnrichedPositions = () => {
	const portfolios = usePortfoliosStore(state => state.portfolios);
	const isEnriched = usePortfoliosStore(state => state.isEnriched);

	if (!portfolios) return [];

	// Собираем все позиции со всех портфелей
	const allPositions = portfolios.flatMap(p => p.positions);

	return { positions: allPositions, isEnriched };
};
