import { action, atom, wrap } from "@reatom/core";
import { bondsApi } from "./bonds";
import type { Bond, BondsData } from "./types";

const CACHE_DURATION_MS = 5 * 60 * 1000;

export const bondsDataAtom = atom<BondsData | null>(null, "bondsDataAtom");
export const bondsMapAtom = atom<Record<string, Bond> | null>(
	null,
	"bondsMapAtom",
);
export const bondsIsLoadingAtom = atom(false, "bondsIsLoadingAtom");
export const bondsErrorAtom = atom<string | null>(null, "bondsErrorAtom");
export const bondsLastFetchTimeAtom = atom<number | null>(
	null,
	"bondsLastFetchTimeAtom",
);

const toBondsMap = (data: BondsData): Record<string, Bond> => {
	const map: Record<string, Bond> = {};

	for (const bond of data.bonds) {
		map[bond.isin] = bond;
		if (bond.name) map[bond.name] = bond;
	}

	return map;
};

const getBond = (bondsMap: Record<string, Bond> | null, isin: string, name: string) =>
	bondsMap?.[isin] || bondsMap?.[name] || null;

export const fetchBonds = action(async (force = false) => {
	const now = Date.now();
	const lastFetchTime = bondsLastFetchTimeAtom();
	const bondsData = bondsDataAtom();

	if (
		!force &&
		bondsData &&
		lastFetchTime &&
		now - lastFetchTime < CACHE_DURATION_MS
	) {
		return;
	}

	bondsIsLoadingAtom.set(true);
	bondsErrorAtom.set(null);

	try {
		const data = await wrap(bondsApi.getLatestBonds());

		if (!data) {
			bondsErrorAtom.set("Failed to fetch bonds data");
			return;
		}

		bondsDataAtom.set(data);
		bondsMapAtom.set(toBondsMap(data));
		bondsLastFetchTimeAtom.set(now);
	} catch (error) {
		bondsErrorAtom.set(error instanceof Error ? error.message : "Unknown error");
	} finally {
		bondsIsLoadingAtom.set(false);
	}
}, "fetchBonds");

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
