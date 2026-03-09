import type { AccountPortfolio } from "~/api/portfolios";

const SNAPSHOTS_KEY = "portfolio_snapshots_v1";

export type PortfolioSnapshot = {
	timestamp: string;
	accountId: string;
	accountName: string;
	currency: string;
	portfolioValue: number;
	positionsCount: number;
};

const moneyToNumber = (value?: { units: number; nano: number } | null) => {
	if (!value) return 0;
	return value.units + value.nano / 1_000_000_000;
};

export const readSnapshots = (): PortfolioSnapshot[] => {
	try {
		const raw = localStorage.getItem(SNAPSHOTS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as PortfolioSnapshot[];
		if (!Array.isArray(parsed)) return [];
		return parsed;
	} catch {
		return [];
	}
};

export const writeSnapshots = (snapshots: PortfolioSnapshot[]) => {
	localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
};

export const savePortfolioSnapshots = (portfolios: AccountPortfolio[]) => {
	const now = new Date();
	const dayKey = now.toISOString().slice(0, 10);
	const current = readSnapshots();

	const next = [...current];

	for (const item of portfolios) {
		const accountId = item.portfolio.accountId || item.positions[0]?.accountId || "";
		const accountName = item.positions[0]?.accountName || "Unknown";
		const portfolioValue = moneyToNumber(item.portfolio.totalAmountPortfolio);
		const currency = item.portfolio.totalAmountPortfolio?.currency || "rub";

		const idx = next.findIndex(
			(s) => s.accountId === accountId && s.timestamp.slice(0, 10) === dayKey,
		);

		const snapshot: PortfolioSnapshot = {
			timestamp: now.toISOString(),
			accountId,
			accountName,
			currency,
			portfolioValue,
			positionsCount: item.positions.length,
		};

		if (idx >= 0) next[idx] = snapshot;
		else next.push(snapshot);
	}

	writeSnapshots(next.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
};
