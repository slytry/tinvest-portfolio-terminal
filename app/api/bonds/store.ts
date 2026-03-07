import { action, atom, computed, wrap } from "@reatom/core";
import { bondsApi } from "./bonds";
import type { Bond, BondsData } from "./types";

const CACHE_DURATION_MS = 5 * 60 * 1000;

type BondsState = {
	data: BondsData | null;
	map: Record<string, Bond> | null;
	isLoading: boolean;
	error: string | null;
	lastFetchTime: number | null;
};

const toBondsMap = (data: BondsData): Record<string, Bond> => {
	const map: Record<string, Bond> = {};

	for (const bond of data.bonds) {
		map[bond.isin] = bond;
		if (bond.name) map[bond.name] = bond;
	}

	return map;
};

const getBond = (
	bondsMap: Record<string, Bond> | null,
	isin: string,
	name: string,
) => bondsMap?.[isin] || bondsMap?.[name] || null;

export const bondsModel = atom<BondsState>(
	{
		data: null,
		map: null,
		isLoading: false,
		error: null,
		lastFetchTime: null,
	},
	"bondsModel",
).extend((target) => ({
	fetch: action(async (force = false) => {
		const now = Date.now();
		const current = target();

		if (
			!force &&
			current.data &&
			current.lastFetchTime &&
			now - current.lastFetchTime < CACHE_DURATION_MS
		) {
			return;
		}

		target.set((state) => ({ ...state, isLoading: true, error: null }));

		try {
			const data = await wrap(bondsApi.getLatestBonds());

			if (!data) {
				target.set((state) => ({
					...state,
					error: "Failed to fetch bonds data",
					isLoading: false,
				}));
				return;
			}

			target.set((state) => ({
				...state,
				data,
				map: toBondsMap(data),
				lastFetchTime: now,
				isLoading: false,
			}));
		} catch (error) {
			target.set((state) => ({
				...state,
				error: error instanceof Error ? error.message : "Unknown error",
				isLoading: false,
			}));
		}
	}, "bondsModel.fetch"),
}));

export const bondsDataAtom = computed(() => bondsModel().data, "bondsDataAtom");
export const bondsMapAtom = computed(() => bondsModel().map, "bondsMapAtom");
export const bondsIsLoadingAtom = computed(
	() => bondsModel().isLoading,
	"bondsIsLoadingAtom",
);
export const bondsErrorAtom = computed(() => bondsModel().error, "bondsErrorAtom");
export const bondsLastFetchTimeAtom = computed(
	() => bondsModel().lastFetchTime,
	"bondsLastFetchTimeAtom",
);

export const fetchBonds = bondsModel.fetch;

export const enrichPositionWithBondData = <
	T extends {
		instrumentType?: string;
		isin?: string;
		instrumentName?: string;
	},
>(
	position: T,
	bondsMap: Record<string, Bond> | null,
) => {
	if (position.instrumentType !== "bond") return position;

	const bondData = getBond(
		bondsMap,
		position.isin || "",
		position.instrumentName || "",
	);
	if (!bondData) return position;

	return {
		...position,
		bondData,
		bondRating: bondData.creditRating,
		bondYtm: bondData.ytm,
		bondMaturity: bondData.maturityDate,
	};
};
