/** biome-ignore-all lint/style/noNonNullAssertion: yes */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: yes */
import {
	Avatar,
	Badge,
	Box,
	Flex,
	Paper,
	RingProgress,
	Select,
	Table,
	Text,
	Title,
	Tooltip,
	Checkbox,
	Popover,
	Button,
	Stack,
} from "@mantine/core";
import type { MoneyValue, Quotation } from "@tinkoff/invest-js-grpc-web";
import { useState } from "react";
import { useBondsStore } from "~/api/bonds/store";
import { getRatingColor } from "~/api/bonds/types";
import { usePortfoliosStore } from "~/api/portfolios";

const formatPrice = (value?: Quotation | MoneyValue): string => {
	if (!value) return "–";
	const total = value.units + value.nano / 1_000_000_000;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 1,
	}).format(total);
};

const formatNumber = (value: number, digits: number = 1): string => {
	return new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits,
	}).format(value);
};

// Функция для форматирования разницы в датах
const formatDateDifference = (dateStr: string): { text: string; color: string; type: string } => {
	if (!dateStr || dateStr === '-' || dateStr === 'n/a') {
		return { text: '—', color: 'gray', type: 'unknown' };
	}

	try {
		const [day, month, year] = dateStr.split('.');
		const targetDate = new Date(`${year}-${month}-${day}`).getTime();
		const now = new Date().getTime();
		const diffMs = targetDate - now;
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffMonths = Math.floor(diffDays / 30);
		const diffYears = Math.floor(diffDays / 365);

		if (diffDays < 0) {
			return {
				text: `Просрочено ${Math.abs(diffDays)} дн.`,
				color: 'red',
				type: 'overdue'
			};
		}

		if (diffDays === 0) {
			return { text: 'Сегодня', color: 'yellow', type: 'today' };
		}

		if (diffDays < 30) {
			return { text: `${diffDays} дн.`, color: 'orange', type: 'soon' };
		}

		if (diffMonths < 12) {
			return { text: `${diffMonths} мес.`, color: 'yellow', type: 'months' };
		}

		return { text: `${diffYears} г. ${diffMonths % 12} мес.`, color: 'green', type: 'years' };
	} catch {
		return { text: dateStr, color: 'gray', type: 'unknown' };
	}
};

// Функция для определения типа события
const getEventType = (eventAtDate: string, maturityDate: string): string => {
	if (!eventAtDate || eventAtDate === '-' || eventAtDate === 'n/a') {
		return 'погашение';
	}

	if (eventAtDate === maturityDate || eventAtDate.toLowerCase().includes('погашение')) {
		return 'погашение';
	}

	if (eventAtDate.toLowerCase().includes('put') || eventAtDate.toLowerCase().includes('продать')) {
		return 'оферта (put)';
	}

	if (eventAtDate.toLowerCase().includes('call') || eventAtDate.toLowerCase().includes('выкуп')) {
		return 'оферта (call)';
	}

	return 'оферта';
};

const moneyToNumber = (value?: MoneyValue | Quotation) => {
	if (!value) return 0;
	return value.units + value.nano / 1_000_000_000;
};

function addPrices(price1: MoneyValue, price2: MoneyValue): MoneyValue {
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

function multiplyPrice(price: MoneyValue, multiplier: Quotation): MoneyValue {
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

const getYieldColor = (yield_?: Quotation) => {
	if (!yield_) return "gray";
	const total = yield_.units + yield_.nano / 1_000_000_000;
	if (total > 0) return "green";
	if (total < 0) return "red";
	return "gray";
};

const typeToRussian = {
	share: "Акции",
	bond: "Облигации",
	etf: "Фонды",
	currency: "Валюта",
};

const typeColors: Record<string, string> = {
	share: "blue",
	bond: "orange",
	etf: "grape",
	currency: "teal",
};

// Типы для настроек колонок - ТЕПЕРЬ ДЛЯ ВСЕХ ТИПОВ
interface ColumnConfig {
	key: string;
	label: string;
	enabled: boolean;
	type?: string; // для фильтрации по типу инструмента
}

export const PositionsTable = () => {
	const portfolios = usePortfoliosStore((state) => state.portfolios);
	const isEnriched = usePortfoliosStore((state) => state.isEnriched);
	const bondsLoading = useBondsStore((state) => state.isLoading);
	const bondsMap = useBondsStore((state) => state.bondsMap);

	const [columnsPopoverOpened, setColumnsPopoverOpened] = useState(false);

	// Настройки колонок для всех типов инструментов
	const [allColumns, setAllColumns] = useState<ColumnConfig[]>([
		// Общие колонки (для всех типов)
		{ key: 'instrument', label: 'Instrument', enabled: true, type: 'all' },
		{ key: 'price', label: 'Price', enabled: true, type: 'all' },
		{ key: 'value', label: 'Value', enabled: true, type: 'all' },
		{ key: 'yield', label: 'Yield', enabled: true, type: 'all' },
		{ key: 'percent', label: '%', enabled: true, type: 'all' },

		// Колонки для облигаций
		{ key: 'maturity', label: 'Срок', enabled: true, type: 'bond' },
		{ key: 'rating', label: 'Рейтинг', enabled: true, type: 'bond' },
		{ key: 'ytm', label: 'YTM', enabled: true, type: 'bond' },
		{ key: 'duration', label: 'Дюрация', enabled: true, type: 'bond' },
		{ key: 'coupon', label: 'Купон', enabled: true, type: 'bond' },
		{ key: 'bondPrice', label: 'Цена %', enabled: false, type: 'bond' },
		{ key: 'volume', label: 'Объем', enabled: false, type: 'bond' },

		// Колонки для акций
		{ key: 'dividend', label: 'Дивиденды', enabled: false, type: 'share' },
		{ key: 'sector', label: 'Сектор', enabled: false, type: 'share' },

		// Колонки для ETF
		{ key: 'expense', label: 'Комиссия', enabled: false, type: 'etf' },
		{ key: 'provider', label: 'Провайдер', enabled: false, type: 'etf' },
	]);

	const sortRules = ["share", "bond", "etf", "currency"];

	// Функция для переключения колонки
	const toggleColumn = (key: string) => {
		setAllColumns(prev =>
			prev.map(col =>
				col.key === key ? { ...col, enabled: !col.enabled } : col
			)
		);
	};

	// Функция для сброса к настройкам по умолчанию
	const resetToDefault = () => {
		setAllColumns(prev =>
			prev.map(col => ({
				...col,
				enabled: ['instrument', 'price', 'value', 'yield', 'percent', 'maturity', 'rating', 'ytm', 'duration', 'coupon'].includes(col.key)
			}))
		);
	};

	const portfoliosWithGroupedPositions =
		portfolios?.map((portfolioData) => {
			const positionsByType: Record<string, any[]> = {
				share: [],
				bond: [],
				etf: [],
				currency: [],
			};

			function removePngExtension(filename?: string) {
				if (!filename) return "NO IMAGE";
				return filename.replace(/\.png$/, "");
			}

			portfolioData.positions.forEach((positionData) => {
				const instrument = positionData.instrument.instrument;
				const bondData = bondsMap?.[instrument?.isin || ''] ||
							   bondsMap?.[instrument?.name || ''];

				const position = {
					accountName: positionData.accountName,
					instrumentName: instrument?.name,
					instrumentType: instrument?.instrumentType,
					isin: instrument?.isin,
					img: removePngExtension(instrument?.brand?.logoName),
					ticker: instrument?.ticker,
					quantity: positionData.position.quantity,
					averagePrice: positionData.position.averagePositionPrice,
					currentPrice: positionData.position.currentPrice,
					expectedYield: positionData.position.expectedYield,
					currentNkd: positionData.position.currentNkd,
					currency: positionData.position.averagePositionPrice?.currency || "rub",
					// Данные из обогащения
					bondRating: bondData?.creditRating,
					bondYtm: bondData?.ytm,
					bondMaturity: bondData?.maturityDate,
					bondFinalMaturity: bondData?.finalMaturityDate,
					bondEventAtDate: bondData?.eventAtDate,
					bondDuration: bondData?.duration,
					bondCoupon: bondData?.couponRate,
					bondPrice: bondData?.price,
					bondVolume: bondData?.volume,
				};

				const type = position.instrumentType as keyof typeof positionsByType;
				if (positionsByType[type]) positionsByType[type].push(position);
			});

			return {
				accountName: portfolioData.positions[0]?.accountName || "Unknown",
				positionsByType,
			};
		}) ?? [];

	const [selectedPortfolio, setSelectedPortfolio] = useState(
		portfoliosWithGroupedPositions[0]?.accountName,
	);

	if (!portfolios) return null;

	const portfolio = portfoliosWithGroupedPositions.find(
		(p) => p.accountName === selectedPortfolio,
	);

	if (!portfolio) return null;

	const allPositions = Object.values(portfolio.positionsByType).flat();

	const positionsWithValue = allPositions.map((position: any) => {
		const value = addPrices(
			multiplyPrice(position.currentPrice, position.quantity),
			multiplyPrice(position.currentNkd, position.quantity),
		);

		const valueNumber = moneyToNumber(value);

		return {
			...position,
			value,
			valueNumber,
		};
	});

	const portfolioTotal = positionsWithValue.reduce(
		(sum, p) => sum + p.valueNumber,
		0,
	);

	positionsWithValue.forEach((p) => {
		p.percent = portfolioTotal === 0 ? 0 : (p.valueNumber / portfolioTotal) * 100;
	});

	const allocation: Record<string, number> = {
		share: 0,
		bond: 0,
		etf: 0,
		currency: 0,
	};

	positionsWithValue.forEach((p) => {
		allocation[p.instrumentType] += p.valueNumber;
	});

	const allocationPercent = Object.entries(allocation).map(([type, value]) => ({
		type,
		percent: portfolioTotal ? (value / portfolioTotal) * 100 : 0,
	}));

	// Получаем активные колонки по типу
	const getActiveColumnsForType = (type: string) => {
		return allColumns.filter(col =>
			(col.type === 'all' || col.type === type) && col.enabled
		);
	};

	return (
		<Flex maw={1400} direction="column" style={{ margin: "30px auto" }}>
			<Flex justify="space-between" align="center">
				<Select
					label="Accounts"
					data={portfoliosWithGroupedPositions.map((p) => ({
						label: p.accountName,
						value: p.accountName,
					}))}
					value={selectedPortfolio}
					onChange={(v) => setSelectedPortfolio(v!)}
					mb="lg"
					maw={300}
				/>

				<Flex gap="sm">
					<Popover
						opened={columnsPopoverOpened}
						onChange={setColumnsPopoverOpened}
						position="bottom-end"
						withArrow
						width={300}
					>
						<Popover.Target>
							<Button
								variant="light"
								size="sm"
								onClick={() => setColumnsPopoverOpened((o) => !o)}
							>
								⚙️ Настройка колонок
							</Button>
						</Popover.Target>
						<Popover.Dropdown>
							<Stack gap="md">
								<Stack gap="xs">
									<Text size="sm" fw={500}>Общие колонки</Text>
									{allColumns.filter(col => col.type === 'all').map(col => (
										<Checkbox
											key={col.key}
											label={col.label}
											checked={col.enabled}
											onChange={() => toggleColumn(col.key)}
										/>
									))}
								</Stack>

								<Stack gap="xs">
									<Text size="sm" fw={500}>Облигации</Text>
									{allColumns.filter(col => col.type === 'bond').map(col => (
										<Checkbox
											key={col.key}
											label={col.label}
											checked={col.enabled}
											onChange={() => toggleColumn(col.key)}
										/>
									))}
								</Stack>

								<Button variant="subtle" size="xs" onClick={resetToDefault}>
									Сбросить к умолчанию
								</Button>
							</Stack>
						</Popover.Dropdown>
					</Popover>
				</Flex>
			</Flex>

			<Title order={3}>Портфель: {portfolio.accountName}</Title>

			<Text size="lg" fw={600} mb="md">
				Общая стоимость:{" "}
				{new Intl.NumberFormat("ru-RU", {
					style: "currency",
					currency: "RUB",
					maximumFractionDigits: 0,
				}).format(portfolioTotal)}
			</Text>

			{/* Allocation Bar */}
			<Flex h={14} mb="lg" style={{ borderRadius: 6, overflow: "hidden" }}>
				{allocationPercent.map((a) => (
					<Box
						key={a.type}
						style={{
							width: `${a.percent}%`,
							background: `var(--mantine-color-${typeColors[a.type]}-6)`,
						}}
					/>
				))}
			</Flex>

			{/* Pie Chart */}
			<Flex mb="xl" gap="lg" align="center">
				<RingProgress
					size={140}
					thickness={16}
					sections={allocationPercent.map((a) => ({
						value: a.percent,
						color: typeColors[a.type],
					}))}
				/>

				<Flex direction="column" gap={4}>
					{allocationPercent.map((a) => (
						<Text key={a.type} size="sm">
							{typeToRussian[a.type as keyof typeof typeToRussian]} —{" "}
							{a.percent.toFixed(1)}%
						</Text>
					))}
				</Flex>
			</Flex>

			{sortRules.map((type) => {
				const positions = positionsWithValue
					.filter((p) => p.instrumentType === type)
					.sort((a, b) => b.percent - a.percent);

				if (!positions.length) return null;

				const activeColumns = getActiveColumnsForType(type);

				return (
					<div key={type} style={{ marginBottom: "1.5rem" }}>
						<Flex justify="space-between" align="center" mb="xs">
							<Title order={4} c="dimmed">
								{typeToRussian[type as keyof typeof typeToRussian]}
							</Title>
							{type === 'bond' && bondsLoading && (
								<Badge size="sm" variant="dot">Загрузка рейтингов...</Badge>
							)}
							{type === 'bond' && !isEnriched && (
								<Badge size="sm" color="yellow">Ожидание данных...</Badge>
							)}
						</Flex>

						<Paper shadow="xs" radius={12} withBorder style={{ overflowX: 'auto' }}>
							<Table highlightOnHover verticalSpacing="md">
								<Table.Thead>
									<Table.Tr>
										{activeColumns.map(col => (
											<Table.Th key={col.key} ta={col.key === 'instrument' ? 'left' : 'right'}>
												{col.label}
											</Table.Th>
										))}
									</Table.Tr>
								</Table.Thead>

								<Table.Tbody>
									{positions.map((position) => {
										const diff = formatDateDifference(position.bondMaturity);
										const eventType = getEventType(
											position.bondEventAtDate,
											position.bondFinalMaturity
										);

										return (
											<Table.Tr key={position.ticker}>
												{activeColumns.map(col => {
													switch(col.key) {
														case 'instrument':
															return (
																<Table.Td key={col.key}>
																	<Flex gap="sm">
																		<Avatar
																			w={36}
																			h={36}
																			radius="xl"
																			src={`//invest-brands.cdn-tinkoff.ru/${position.img}x160.png`}
																		/>
																		<Flex direction="column">
																			<Text size="sm">{position.instrumentName}</Text>
																			<Text size="xs" c="gray">
																				{position.ticker}
																			</Text>
																		</Flex>
																	</Flex>
																</Table.Td>
															);

														case 'price':
															return (
																<Table.Td key={col.key} ta="right">
																	<Tooltip label="Средняя → Текущая">
																		<Text size="sm">
																			{formatPrice(position.averagePrice)} →{" "}
																			{formatPrice(position.currentPrice)}
																		</Text>
																	</Tooltip>
																</Table.Td>
															);

														case 'value':
															return (
																<Table.Td key={col.key} ta="right">
																	<Flex direction="column">
																		<Text size="sm">{formatPrice(position.value)}</Text>
																		<Text size="xs" c="gray">
																			{position.quantity.units} шт
																		</Text>
																	</Flex>
																</Table.Td>
															);

														case 'yield':
															return (
																<Table.Td key={col.key} ta="right">
																	<Badge
																		color={getYieldColor(position.expectedYield)}
																		variant="light"
																	>
																		{formatPrice(position.expectedYield)}
																	</Badge>
																</Table.Td>
															);

														case 'percent':
															return (
																<Table.Td key={col.key} ta="right">
																	<Text fw={500}>{position.percent.toFixed(2)}%</Text>
																</Table.Td>
															);

														case 'maturity':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondMaturity ? (
																		<Tooltip
																			label={`${eventType} ${position.bondMaturity}`}
																		>
																			<Badge color={diff.color} variant="light">
																				{diff.text}
																			</Badge>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														case 'rating':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondRating ? (
																		<Tooltip label={`Кредитный рейтинг: ${position.bondRating}`}>
																			<Badge
																				color={getRatingColor(position.bondRating)}
																				variant="light"
																				size="lg"
																				style={{ minWidth: 60 }}
																			>
																				{position.bondRating}
																			</Badge>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														case 'ytm':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondYtm ? (
																		<Tooltip label="Эффективная доходность">
																			<Badge color="blue" variant="light">
																				{formatNumber(position.bondYtm, 1)}%
																			</Badge>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														case 'duration':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondDuration ? (
																		<Tooltip label="Дюрация (лет)">
																			<Text size="sm">
																				{formatNumber(position.bondDuration, 2)}
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														case 'coupon':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondCoupon ? (
																		<Tooltip label="Текущий купон">
																			<Text size="sm">
																				{formatNumber(position.bondCoupon, 2)}%
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														case 'bondPrice':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondPrice ? (
																		<Tooltip label="Цена % от номинала">
																			<Text size="sm">
																				{formatNumber(position.bondPrice, 2)}%
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														case 'volume':
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondVolume ? (
																		<Tooltip label="Объем выпуска (млрд)">
																			<Text size="sm">
																				{formatNumber(position.bondVolume, 2)} млрд
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">—</Text>
																	)}
																</Table.Td>
															);

														default:
															return null;
													}
												})}
											</Table.Tr>
										);
									})}
								</Table.Tbody>
							</Table>
						</Paper>
					</div>
				);
			})}
		</Flex>
	);
};
