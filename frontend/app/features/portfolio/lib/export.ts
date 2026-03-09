import { formatNumber, formatPrice, moneyToNumber } from "./table-helpers";
import type { PromptTemplate } from "../model/prompt-templates";

export type ExportRow = {
	instrumentName?: string;
	isin?: string;
	percent: number;
	averagePrice: unknown;
	currentPrice: unknown;
	quantity: unknown;
	expectedYield: unknown;
	bondYtm?: number;
	bondMaturity?: string;
	currency?: string;
};

const csvEscape = (value: string) => {
	const escaped = value.replace(/"/g, '""');
	return `"${escaped}"`;
};

export const formatQuantity = (quantity: unknown): string => {
	const raw = moneyToNumber(quantity as never);
	const digits = Number.isInteger(raw) ? 0 : 4;
	return formatNumber(raw, digits);
};

export const buildPortfolioForPrompt = (rows: ExportRow[]) => {
	return rows
		.map((position, index) => {
			const yieldValue = position.bondYtm
				? `${formatNumber(position.bondYtm, 1)}%`
				: formatPrice(position.expectedYield as never);

			return `${index + 1}. ${position.instrumentName || "-"}
ISIN: ${position.isin || "-"}
доля: ${position.percent.toFixed(2)}%
цена покупки: ${formatPrice(position.averagePrice as never)}
текущая цена: ${formatPrice(position.currentPrice as never)}
колличесво: ${formatQuantity(position.quantity)}
доходность: ${yieldValue}
погашение: ${position.bondMaturity || "-"}
валюта: ${(position.currency || "-").toUpperCase()}

---`;
		})
		.join("\n\n");
};

export const buildAnalysisPrompt = (
	template: PromptTemplate,
	rows: ExportRow[],
) => {
	return template.template.replace("{{portfolio}}", buildPortfolioForPrompt(rows));
};

export const buildPortfolioCsv = (rows: ExportRow[], accountName: string) => {
	const header = [
		"ISIN",
		"Название",
		"Доля в портфеле",
		"Текущая цена",
		"Количество",
	]
		.map(csvEscape)
		.join(";");

	const csvRows = rows.map((position) =>
		[
			position.isin || "",
			position.instrumentName || "",
			`${position.percent.toFixed(2)}%`,
			formatPrice(position.currentPrice as never),
			formatQuantity(position.quantity),
		]
			.map((value) => csvEscape(String(value)))
			.join(";"),
	);

	const csv = [header, ...csvRows].join("\n");
	const date = new Date().toISOString().slice(0, 10);
	const filename = `portfolio_${accountName.replace(/\s+/g, "_")}_${date}.csv`;

	return { csv, filename };
};
