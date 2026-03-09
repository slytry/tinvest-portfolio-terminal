import type { MoneyValue, Quotation } from "~/api/portfolios";

export const formatPrice = (value?: Quotation | MoneyValue): string => {
	if (!value) return "–";
	const total = value.units + value.nano / 1_000_000_000;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 1,
	}).format(total);
};

export const formatNumber = (value: number, digits = 1): string => {
	return new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits,
	}).format(value);
};

export const formatDateDifference = (
	dateStr: string,
): { text: string; color: string; type: string } => {
	if (!dateStr || dateStr === "-" || dateStr === "n/a") {
		return { text: "—", color: "gray", type: "unknown" };
	}

	try {
		const [day, month, year] = dateStr.split(".");
		const targetDate = new Date(`${year}-${month}-${day}`).getTime();
		const now = new Date().getTime();
		const diffMs = targetDate - now;
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffMonths = Math.floor(diffDays / 30);
		const diffYears = Math.floor(diffDays / 365);

		if (diffDays < 0) {
			return {
				text: `Просрочено ${Math.abs(diffDays)} дн.`,
				color: "red",
				type: "overdue",
			};
		}

		if (diffDays === 0) {
			return { text: "Сегодня", color: "yellow", type: "today" };
		}

		if (diffDays < 30) {
			return { text: `${diffDays} дн.`, color: "orange", type: "soon" };
		}

		if (diffMonths < 12) {
			return { text: `${diffMonths} мес.`, color: "yellow", type: "months" };
		}

		return {
			text: `${diffYears} г. ${diffMonths % 12} мес.`,
			color: "green",
			type: "years",
		};
	} catch {
		return { text: dateStr, color: "gray", type: "unknown" };
	}
};

export const getEventType = (eventAtDate: string, maturityDate: string): string => {
	if (!eventAtDate || eventAtDate === "-" || eventAtDate === "n/a") {
		return "погашение";
	}

	if (
		eventAtDate === maturityDate ||
		eventAtDate.toLowerCase().includes("погашение")
	) {
		return "погашение";
	}

	if (
		eventAtDate.toLowerCase().includes("put") ||
		eventAtDate.toLowerCase().includes("продать")
	) {
		return "оферта (put)";
	}

	if (
		eventAtDate.toLowerCase().includes("call") ||
		eventAtDate.toLowerCase().includes("выкуп")
	) {
		return "оферта (call)";
	}

	return "оферта";
};

export const moneyToNumber = (value?: MoneyValue | Quotation) => {
	if (!value) return 0;
	return value.units + value.nano / 1_000_000_000;
};

export function addPrices(price1: MoneyValue, price2: MoneyValue): MoneyValue {
	if (!price1 || !price2) return { currency: "rub", units: 0, nano: 0 };

	let units = price1.units + price2.units;
	let nano = price1.nano + price2.nano;

	const NANO = 1_000_000_000;

	if (nano >= NANO) {
		units += Math.floor(nano / NANO);
		nano %= NANO;
	}

	return { currency: price1.currency, units, nano };
}

export function multiplyPrice(
	price: MoneyValue,
	multiplier: Quotation,
): MoneyValue {
	if (!price) return { currency: "rub", units: 0, nano: 0 };

	const multiplierUnits = multiplier.nano
		? multiplier.units + multiplier.nano / 1_000_000_000
		: multiplier.units;

	const priceNano = price.units * 1_000_000_000 + price.nano;
	const totalNano = priceNano * multiplierUnits;

	return {
		currency: price.currency,
		units: Math.floor(totalNano / 1_000_000_000),
		nano: totalNano % 1_000_000_000,
	};
}

export const getYieldColor = (yield_?: Quotation) => {
	if (!yield_) return "gray";
	const total = yield_.units + yield_.nano / 1_000_000_000;
	if (total > 0) return "green";
	if (total < 0) return "red";
	return "gray";
};

export const typeToRussian = {
	share: "Акции",
	bond: "Облигации",
	etf: "Фонды",
	currency: "Валюта",
	other: "Прочее",
};

export const typeColors: Record<string, string> = {
	share: "blue",
	bond: "orange",
	etf: "grape",
	currency: "teal",
	other: "gray",
};
