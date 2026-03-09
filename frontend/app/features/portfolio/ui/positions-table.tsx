/** biome-ignore-all lint/style/noNonNullAssertion: yes */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: yes */
import {
	Avatar,
	Badge,
	Box,
	Button,
	Checkbox,
	Flex,
	Group,
	Paper,
	Popover,
	RingProgress,
	SimpleGrid,
	Select,
	Stack,
	Table,
	Text,
	ThemeIcon,
	Title,
	Tooltip,
	Progress,
	useComputedColorScheme,
} from "@mantine/core";
import { reatomComponent } from "@reatom/react";
import { useEffect, useMemo, useState } from "react";
import { bondsIsLoadingAtom, bondsMapAtom } from "~/api/bonds/store";
import { getRatingColor } from "~/api/bonds/types";
import { portfoliosAtom, portfoliosIsEnrichedAtom } from "~/api/portfolios";
import {
	buildPortfolioCsv,
	type ExportRow,
} from "~/features/portfolio/lib/export";
import {
	addPrices,
	formatDateDifference,
	formatNumber,
	formatPrice,
	getEventType,
	getYieldColor,
	moneyToNumber,
	multiplyPrice,
	typeColors,
	typeToRussian,
} from "~/features/portfolio/lib/table-helpers";
import { PROMPT_TEMPLATES } from "~/features/portfolio/model/prompt-templates";
import { AnalysisModal } from "./analysis-modal";

// Типы для настроек колонок - ТЕПЕРЬ ДЛЯ ВСЕХ ТИПОВ
interface ColumnConfig {
	key: string;
	label: string;
	enabled: boolean;
	type?: string; // для фильтрации по типу инструмента
}

type PortfolioUiSettings = {
	selectedPortfolioId: string | null;
	selectedPromptTemplate: string;
	allColumns: ColumnConfig[];
};

const PORTFOLIO_UI_SETTINGS_KEY = "portfolio_ui_settings_v1";

const DEFAULT_COLUMNS: ColumnConfig[] = [
	{ key: "instrument", label: "Instrument", enabled: true, type: "all" },
	{ key: "price", label: "Price", enabled: true, type: "all" },
	{ key: "value", label: "Value", enabled: true, type: "all" },
	{ key: "yield", label: "Yield", enabled: true, type: "all" },
	{ key: "percent", label: "%", enabled: true, type: "all" },
	{ key: "currencyCode", label: "Валюта", enabled: false, type: "all" },
	{ key: "accrued", label: "НКД", enabled: false, type: "bond" },
	{ key: "maturity", label: "Срок", enabled: true, type: "bond" },
	{ key: "event", label: "Событие", enabled: false, type: "bond" },
	{ key: "rating", label: "Рейтинг", enabled: true, type: "bond" },
	{ key: "ytm", label: "YTM", enabled: true, type: "bond" },
	{ key: "duration", label: "Дюрация", enabled: true, type: "bond" },
	{ key: "coupon", label: "Купон", enabled: true, type: "bond" },
	{ key: "bondPrice", label: "Цена %", enabled: false, type: "bond" },
	{ key: "volume", label: "Объем", enabled: false, type: "bond" },
	{ key: "dividend", label: "Дивиденды", enabled: false, type: "share" },
	{ key: "sector", label: "Сектор", enabled: false, type: "share" },
	{ key: "expense", label: "Комиссия", enabled: false, type: "etf" },
	{ key: "provider", label: "Провайдер", enabled: false, type: "etf" },
];

const readPortfolioUiSettings = (): Partial<PortfolioUiSettings> => {
	try {
		const raw = localStorage.getItem(PORTFOLIO_UI_SETTINGS_KEY);
		if (!raw) return {};
		return JSON.parse(raw) as Partial<PortfolioUiSettings>;
	} catch {
		return {};
	}
};

const COLUMN_DESCRIPTIONS: Record<string, string> = {
	instrument: "Название инструмента и тикер.",
	price: "Средняя цена входа и текущая рыночная цена позиции.",
	value: "Текущая стоимость позиции с учетом цены и НКД.",
	yield: "Текущий финансовый результат позиции.",
	percent: "Доля позиции в общей стоимости выбранного портфеля.",
	accrued: "Накопленный купонный доход (НКД) по позиции.",
	currencyCode: "Валюта инструмента.",
	maturity: "Срок до ближайшего события/погашения.",
	event: "Тип ближайшего события по выпуску (оферта/call/put/погашение).",
	rating: "Кредитный рейтинг облигации.",
	ytm: "Доходность к погашению (Yield to Maturity).",
	duration: "Дюрация: чувствительность цены к изменению ставок.",
	coupon: "Купонная ставка облигации.",
	bondPrice: "Цена облигации в процентах от номинала.",
	volume: "Оценочный объем выпуска облигации.",
	dividend: "Дивидендные параметры акции (если доступны).",
	sector: "Сектор/отрасль эмитента.",
	expense: "Комиссия фонда (expense ratio).",
	provider: "Управляющая компания/провайдер фонда.",
};

export const PositionsTable = reatomComponent(() => {
	const colorScheme = useComputedColorScheme("light");
	const isDark = colorScheme === "dark";
	const portfolios = portfoliosAtom();
	const isEnriched = portfoliosIsEnrichedAtom();
	const bondsLoading = bondsIsLoadingAtom();
	const bondsMap = bondsMapAtom();

	const [columnsPopoverOpened, setColumnsPopoverOpened] = useState(false);
	const [analysisModalOpened, setAnalysisModalOpened] = useState(false);
	const storedSettings = useMemo(() => readPortfolioUiSettings(), []);
	const [selectedPromptTemplate, setSelectedPromptTemplate] = useState(
		storedSettings.selectedPromptTemplate || PROMPT_TEMPLATES[0].key,
	);
	const [allColumns, setAllColumns] = useState<ColumnConfig[]>(
		(storedSettings.allColumns as ColumnConfig[]) || DEFAULT_COLUMNS,
	);

	const sortRules = ["share", "bond", "etf", "currency"] as const;
	const portfolioStructureOrder = [...sortRules, "other"] as const;

	// Функция для переключения колонки
	const toggleColumn = (key: string) => {
		setAllColumns((prev) =>
			prev.map((col) =>
				col.key === key ? { ...col, enabled: !col.enabled } : col,
			),
		);
	};

	// Функция для сброса к настройкам по умолчанию
	const resetToDefault = () => {
		setAllColumns((prev) =>
			prev.map((col) => ({
				...col,
				enabled: [
					"instrument",
					"price",
					"value",
					"yield",
					"percent",
					"currencyCode",
					"maturity",
					"rating",
					"ytm",
					"duration",
					"coupon",
				].includes(col.key),
			})),
		);
	};

	const portfoliosWithGroupedPositions = useMemo(
		() =>
			portfolios?.map((portfolioData, index) => {
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
				const bondData =
					bondsMap?.[instrument?.isin || ""] ||
					bondsMap?.[instrument?.name || ""];

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
					currency:
						instrument?.currency ||
						positionData.position.currentPrice?.currency ||
						positionData.position.averagePositionPrice?.currency ||
						"rub",
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

			const rawName = portfolioData.positions[0]?.accountName;
			const accountName =
				rawName && rawName.trim().length > 0 ? rawName : `Счёт #${index + 1}`;
			const accountId =
				portfolioData.portfolio.accountId ||
				portfolioData.positions[0]?.accountId ||
				`${index}`;

			return {
				id: accountId,
				accountName,
				positionsByType,
			};
		}) ?? [],
		[portfolios, bondsMap],
	);

	const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(
		storedSettings.selectedPortfolioId || null,
	);

	useEffect(() => {
		if (!portfoliosWithGroupedPositions.length) return;
		if (
			selectedPortfolio &&
			portfoliosWithGroupedPositions.some((p) => p.id === selectedPortfolio)
		) {
			return;
		}
		setSelectedPortfolio(portfoliosWithGroupedPositions[0]?.id || null);
	}, [portfoliosWithGroupedPositions, selectedPortfolio]);

	useEffect(() => {
		const payload: PortfolioUiSettings = {
			selectedPortfolioId: selectedPortfolio,
			selectedPromptTemplate,
			allColumns,
		};
		localStorage.setItem(PORTFOLIO_UI_SETTINGS_KEY, JSON.stringify(payload));
	}, [allColumns, selectedPortfolio, selectedPromptTemplate]);

	if (!portfolios) return null;

	const portfolio = portfoliosWithGroupedPositions.find(
		(p) => p.id === selectedPortfolio,
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
		p.percent =
			portfolioTotal === 0 ? 0 : (p.valueNumber / portfolioTotal) * 100;
	});

	const allocation: Record<string, number> = {
		share: 0,
		bond: 0,
		etf: 0,
		currency: 0,
		other: 0,
	};

	positionsWithValue.forEach((p) => {
		const key = sortRules.includes(p.instrumentType) ? p.instrumentType : "other";
		allocation[key] = (allocation[key] || 0) + p.valueNumber;
	});

	const grossAllocationBase = Math.max(
		portfolioStructureOrder.reduce(
			(sum, type) => sum + Math.abs(allocation[type] || 0),
			0,
		),
		1,
	);
	const allocationPercent = portfolioStructureOrder.map((type) => ({
		type,
		percent: (Math.abs(allocation[type] || 0) / grossAllocationBase) * 100,
	}));
	const allocationDetails = portfolioStructureOrder
		.map((type) => {
			const value = allocation[type] || 0;
			const percent = (Math.abs(value) / grossAllocationBase) * 100;
			const positionsCount = positionsWithValue.filter(
				(p) =>
					type === "other"
						? !sortRules.includes(p.instrumentType)
						: p.instrumentType === type,
			).length;
			return { type, value, percent, positionsCount };
		})
		.filter((item) => item.positionsCount > 0 || item.value !== 0)
		.sort((a, b) => b.value - a.value);
	const dominantAllocation = allocationDetails[0];

	const bondPositions = positionsWithValue.filter((p) => p.instrumentType === "bond");
	const bondCount = bondPositions.length;
	const weightedYtm =
		bondPositions.reduce((sum, p) => sum + (p.bondYtm || 0) * p.valueNumber, 0) /
		Math.max(
			bondPositions.reduce((sum, p) => sum + p.valueNumber, 0),
			1,
		);
	const weightedDuration =
		bondPositions.reduce(
			(sum, p) => sum + (p.bondDuration || 0) * p.valueNumber,
			0,
		) /
		Math.max(
			bondPositions.reduce((sum, p) => sum + p.valueNumber, 0),
			1,
		);
	const weightedCoupon =
		bondPositions.reduce((sum, p) => sum + (p.bondCoupon || 0) * p.valueNumber, 0) /
		Math.max(
			bondPositions.reduce((sum, p) => sum + p.valueNumber, 0),
			1,
		);
	const bondShare = allocationPercent.find((a) => a.type === "bond")?.percent || 0;
	const totalBondValue = Math.max(
		bondPositions.reduce((sum, p) => sum + p.valueNumber, 0),
		1,
	);
	const highYieldShare =
		bondPositions.reduce((sum, p) => {
			const rating = String(p.bondRating || "").toUpperCase();
			const isHighYield =
				rating.startsWith("BB") ||
				rating.startsWith("B") ||
				rating.includes("CCC") ||
				rating.includes("CC") ||
				rating.includes("C");

			return sum + (isHighYield ? p.valueNumber : 0);
		}, 0) / totalBondValue;

	const ratingWeights = bondPositions.reduce(
		(acc, p) => {
			const rating = String(p.bondRating || "NR").toUpperCase();
			if (rating.startsWith("AAA") || rating.startsWith("AA")) acc.ig += p.valueNumber;
			else if (rating.startsWith("A")) acc.a += p.valueNumber;
			else if (rating.startsWith("BBB")) acc.bbb += p.valueNumber;
			else if (rating.startsWith("BB") || rating.startsWith("B")) {
				acc.hy += p.valueNumber;
			} else {
				acc.nr += p.valueNumber;
			}
			return acc;
		},
		{ ig: 0, a: 0, bbb: 0, hy: 0, nr: 0 },
	);

	const ratingDistribution = [
		{
			key: "ig",
			label: "AAA-AA",
			value: (ratingWeights.ig / totalBondValue) * 100,
			color: "teal",
		},
		{
			key: "a",
			label: "A",
			value: (ratingWeights.a / totalBondValue) * 100,
			color: "green",
		},
		{
			key: "bbb",
			label: "BBB",
			value: (ratingWeights.bbb / totalBondValue) * 100,
			color: "blue",
		},
		{
			key: "hy",
			label: "BB-B",
			value: (ratingWeights.hy / totalBondValue) * 100,
			color: "orange",
		},
		{
			key: "nr",
			label: "NR/ниже",
			value: (ratingWeights.nr / totalBondValue) * 100,
			color: "gray",
		},
	];

	const avgRatingRiskScore = ratingDistribution.reduce((score, item) => {
		const weight = item.value / 100;
		const bucketScore =
			item.key === "ig"
				? 15
				: item.key === "a"
					? 25
					: item.key === "bbb"
						? 45
						: item.key === "hy"
							? 75
							: 85;
		return score + weight * bucketScore;
	}, 0);

	const creditRisk = Math.min(100, Math.round(avgRatingRiskScore + highYieldShare * 25));
	const rateRisk = Math.min(100, Math.round(weightedDuration * 18));
	const lowLiquidityShare =
		bondPositions.reduce((sum, p) => {
			const volume = Number(p.bondVolume || 0);
			return sum + (volume > 0 && volume < 10 ? p.valueNumber : 0);
		}, 0) / totalBondValue;
	const liquidityRisk = Math.min(
		100,
		Math.round(lowLiquidityShare * 100 + (bondPositions.length ? 15 : 0)),
	);

	// Получаем активные колонки по типу
	const getActiveColumnsForType = (type: string) => {
		return allColumns.filter(
			(col) => (col.type === "all" || col.type === type) && col.enabled,
		);
	};

	const renderColumnCheckbox = (col: ColumnConfig) => (
		<Checkbox
			key={col.key}
			checked={col.enabled}
			onChange={() => toggleColumn(col.key)}
			label={
				<Tooltip
					label={COLUMN_DESCRIPTIONS[col.key] || "Описание показателя"}
					multiline
					w={260}
					position="right"
					withArrow
				>
					<Text
						span
						style={{ cursor: "help", textDecoration: "underline dotted" }}
					>
						{col.label}
					</Text>
				</Tooltip>
			}
		/>
	);

	const sortedRows: ExportRow[] = sortRules.flatMap((type) =>
		positionsWithValue
			.filter((p) => p.instrumentType === type)
			.sort((a, b) => b.percent - a.percent),
	);

	const exportCurrentTableToCsv = () => {
		if (!sortedRows.length) return;

		const { csv, filename } = buildPortfolioCsv(
			sortedRows,
			portfolio.accountName,
		);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<Flex
			maw={1400}
			direction="column"
			gap="md"
			style={{ margin: "10px auto" }}
		>
			<Flex
				className="portfolio-toolbar"
				justify="space-between"
				align="center"
			>
				<Select
					label="Accounts"
					data={portfoliosWithGroupedPositions.map((p) => ({
						label: p.accountName,
						value: p.id,
					}))}
					value={selectedPortfolio}
					onChange={(v) => setSelectedPortfolio(v!)}
					maw={400}
				/>

				<Flex gap="sm">
					<Button
						variant={isDark ? "default" : "light"}
						size="sm"
						onClick={() => setAnalysisModalOpened(true)}
					>
						Анализ портфеля
					</Button>

					<Button
						variant={isDark ? "default" : "light"}
						size="sm"
						onClick={exportCurrentTableToCsv}
					>
						Выгрузить CSV
					</Button>

					<Popover
						opened={columnsPopoverOpened}
						onChange={setColumnsPopoverOpened}
						position="bottom-end"
						withArrow
						width={300}
					>
						<Popover.Target>
							<Button
								variant={isDark ? "default" : "light"}
								size="sm"
								onClick={() => setColumnsPopoverOpened((o) => !o)}
							>
								⚙️ Настройка колонок
							</Button>
						</Popover.Target>
						<Popover.Dropdown>
							<Stack gap="md">
								<Text size="xs" c="dimmed">
									Наведите на показатель, чтобы увидеть пояснение.
								</Text>

								<Stack gap="xs">
									<Text size="sm" fw={500}>
										Общие колонки
									</Text>
									{allColumns
										.filter((col) => col.type === "all")
										.map(renderColumnCheckbox)}
								</Stack>

								<Stack gap="xs">
									<Text size="sm" fw={500}>
										Облигации
									</Text>
									{allColumns
										.filter((col) => col.type === "bond")
										.map(renderColumnCheckbox)}
								</Stack>

								<Button variant="subtle" size="xs" onClick={resetToDefault}>
									Сбросить к умолчанию
								</Button>
							</Stack>
						</Popover.Dropdown>
					</Popover>
				</Flex>
			</Flex>

			<Title order={3} fw={800}>
				Портфель: {portfolio.accountName}
			</Title>

			<Text size="lg" fw={600} mb="md">
				Общая стоимость:{" "}
				{new Intl.NumberFormat("ru-RU", {
					style: "currency",
					currency: "RUB",
					maximumFractionDigits: 0,
				}).format(portfolioTotal)}
			</Text>

			<Paper withBorder radius="lg" p="md">
				<Stack gap="md">
					<Title order={5}>Сводка по портфелю</Title>
					<SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
						<Paper withBorder radius="md" p="sm">
							<Text size="xs" c="dimmed">
								Позиций
							</Text>
							<Text size="xl" fw={700}>
								{positionsWithValue.length}
							</Text>
						</Paper>
						<Paper withBorder radius="md" p="sm">
							<Text size="xs" c="dimmed">
								Доля облигаций
							</Text>
							<Text size="xl" fw={700}>
								{bondShare.toFixed(1)}%
							</Text>
						</Paper>
						<Paper withBorder radius="md" p="sm">
							<Text size="xs" c="dimmed">
								Средний YTM (взв.)
							</Text>
							<Text size="xl" fw={700}>
								{bondCount ? `${weightedYtm.toFixed(1)}%` : "—"}
							</Text>
						</Paper>
						<Paper withBorder radius="md" p="sm">
							<Text size="xs" c="dimmed">
								Средняя дюрация (взв.)
							</Text>
							<Text size="xl" fw={700}>
								{bondCount ? `${weightedDuration.toFixed(2)} г.` : "—"}
							</Text>
						</Paper>
					</SimpleGrid>

					<Stack gap={6}>
						<Text size="xs" c="dimmed">
							Купонный профиль портфеля
						</Text>
						<Progress value={Math.min(100, weightedCoupon * 2)} radius="xl" />
						<Text size="xs">
							{bondCount ? `${weightedCoupon.toFixed(2)}%` : "—"}
						</Text>
					</Stack>

					<Stack gap={8}>
						<Text size="xs" c="dimmed">
							Risk strip
						</Text>
						<SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
							<Paper withBorder radius="md" p="xs">
								<Flex justify="space-between" mb={4}>
									<Text size="xs" c="dimmed">
										Credit risk
									</Text>
									<Text size="xs" fw={700}>
										{creditRisk}
									</Text>
								</Flex>
								<Progress value={creditRisk} color="orange" radius="xl" />
							</Paper>

							<Paper withBorder radius="md" p="xs">
								<Flex justify="space-between" mb={4}>
									<Text size="xs" c="dimmed">
										Rate risk
									</Text>
									<Text size="xs" fw={700}>
										{rateRisk}
									</Text>
								</Flex>
								<Progress value={rateRisk} color="blue" radius="xl" />
							</Paper>

							<Paper withBorder radius="md" p="xs">
								<Flex justify="space-between" mb={4}>
									<Text size="xs" c="dimmed">
										Liquidity risk
									</Text>
									<Text size="xs" fw={700}>
										{liquidityRisk}
									</Text>
								</Flex>
								<Progress value={liquidityRisk} color="grape" radius="xl" />
							</Paper>
						</SimpleGrid>
					</Stack>

					<Stack gap={8}>
						<Text size="xs" c="dimmed">
							Распределение рейтингов (по стоимости облигаций)
						</Text>
						<Flex h={14} style={{ borderRadius: 999, overflow: "hidden" }}>
							{ratingDistribution.map((item) => (
								<Box
									key={item.key}
									style={{
										width: `${item.value}%`,
										background: `var(--mantine-color-${item.color}-${isDark ? 4 : 6})`,
									}}
								/>
							))}
						</Flex>
						<SimpleGrid cols={{ base: 2, md: 5 }} spacing="xs">
							{ratingDistribution.map((item) => (
								<Flex key={item.key} gap={6} align="center">
									<ThemeIcon size={10} radius="xl" color={item.color} />
									<Text size="xs">
										{item.label}: {item.value.toFixed(1)}%
									</Text>
								</Flex>
							))}
						</SimpleGrid>
					</Stack>
				</Stack>
			</Paper>

			<Paper withBorder radius="lg" p="md" mb="xl">
				<Stack gap="md">
					<Group justify="space-between" align="end">
						<Title order={5}>Структура активов</Title>
						<Text size="xs" c="dimmed">
							Доминирует:{" "}
							{dominantAllocation
								? `${typeToRussian[dominantAllocation.type as keyof typeof typeToRussian]} (${dominantAllocation.percent.toFixed(1)}%)`
								: "—"}
						</Text>
					</Group>

					<SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
						<Flex justify="center" align="center">
							<RingProgress
								size={190}
								thickness={20}
								roundCaps
								sections={allocationDetails.map((item) => ({
									value: item.percent,
									color: `${typeColors[item.type]}.${isDark ? 4 : 6}`,
								}))}
								label={
									<Stack gap={0} align="center">
										<Text size="xs" c="dimmed">
											Итого
										</Text>
										<Text fw={800} size="sm">
											{new Intl.NumberFormat("ru-RU", {
												style: "currency",
												currency: "RUB",
												maximumFractionDigits: 0,
											}).format(portfolioTotal)}
										</Text>
									</Stack>
								}
							/>
						</Flex>

						<Stack gap="xs">
							<Flex h={14} style={{ borderRadius: 999, overflow: "hidden" }}>
								{allocationDetails.map((item) => (
									<Box
										key={`allocation-strip-${item.type}`}
										style={{
											width: `${item.percent}%`,
											background: `var(--mantine-color-${typeColors[item.type]}-${isDark ? 4 : 6})`,
										}}
									/>
								))}
							</Flex>
							{allocationDetails.map((item) => (
								<Paper key={`allocation-card-${item.type}`} withBorder radius="md" p="xs">
									<Group justify="space-between" align="center">
										<Group gap={8}>
											<ThemeIcon
												size={12}
												radius="xl"
												color={typeColors[item.type]}
												variant="filled"
											/>
											<Text size="sm" fw={600}>
												{typeToRussian[item.type as keyof typeof typeToRussian]}
											</Text>
										</Group>
										<Text size="sm" fw={700}>
											{item.percent.toFixed(1)}%
										</Text>
									</Group>
									<Group justify="space-between" mt={4}>
										<Text size="xs" c="dimmed">
											{new Intl.NumberFormat("ru-RU", {
												style: "currency",
												currency: "RUB",
												maximumFractionDigits: 0,
											}).format(item.value)}
										</Text>
										<Text size="xs" c="dimmed">
											{item.positionsCount} поз.
										</Text>
									</Group>
								</Paper>
							))}
						</Stack>
					</SimpleGrid>
				</Stack>
			</Paper>

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
							{type === "bond" && bondsLoading && (
								<Badge size="sm" variant="dot">
									Загрузка рейтингов...
								</Badge>
							)}
							{type === "bond" && !isEnriched && (
								<Badge size="sm" color="yellow">
									Ожидание данных...
								</Badge>
							)}
						</Flex>

						<Paper
							shadow="xs"
							radius={12}
							withBorder
							style={{ overflowX: "auto" }}
						>
							<Table highlightOnHover verticalSpacing="md">
								<Table.Thead>
									<Table.Tr>
										{activeColumns.map((col) => (
											<Table.Th
												key={col.key}
												ta={col.key === "instrument" ? "left" : "right"}
											>
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
											position.bondFinalMaturity,
										);

										return (
											<Table.Tr key={position.ticker}>
												{activeColumns.map((col) => {
													switch (col.key) {
														case "instrument":
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
																			<Text size="sm">
																				{position.instrumentName}
																			</Text>
																			<Text size="xs" c="gray">
																				{position.ticker}
																			</Text>
																		</Flex>
																	</Flex>
																</Table.Td>
															);

														case "price":
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

														case "value":
															return (
																<Table.Td key={col.key} ta="right">
																	<Flex direction="column">
																		<Text size="sm">
																			{formatPrice(position.value)}
																		</Text>
																		<Text size="xs" c="gray">
																			{position.quantity.units} шт
																		</Text>
																	</Flex>
																</Table.Td>
															);

														case "yield":
															return (
																<Table.Td key={col.key} ta="right">
																	<Badge
																		color={getYieldColor(
																			position.expectedYield,
																		)}
																		variant="light"
																	>
																		{formatPrice(position.expectedYield)}
																	</Badge>
																</Table.Td>
															);

														case "percent":
															return (
																<Table.Td key={col.key} ta="right">
																	<Text fw={500}>
																		{position.percent.toFixed(2)}%
																	</Text>
																</Table.Td>
															);

														case "currencyCode":
															return (
																<Table.Td key={col.key} ta="right">
																	<Badge variant="light" color="gray">
																		{(position.currency || "—").toUpperCase()}
																	</Badge>
																</Table.Td>
															);

														case "accrued":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.currentNkd ? (
																		<Text size="sm">{formatPrice(position.currentNkd)}</Text>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "maturity":
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
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "event":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondEventAtDate ? (
																		<Text size="sm">
																			{getEventType(
																				position.bondEventAtDate,
																				position.bondFinalMaturity,
																			)}
																		</Text>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "rating":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondRating ? (
																		<Tooltip
																			label={`Кредитный рейтинг: ${position.bondRating}`}
																		>
																			<Badge
																				color={getRatingColor(
																					position.bondRating,
																				)}
																				variant="light"
																				size="lg"
																				style={{ minWidth: 60 }}
																			>
																				{position.bondRating}
																			</Badge>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "ytm":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondYtm ? (
																		<Tooltip label="Эффективная доходность">
																			<Badge color="blue" variant="light">
																				{formatNumber(position.bondYtm, 1)}%
																			</Badge>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "duration":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondDuration ? (
																		<Tooltip label="Дюрация (лет)">
																			<Text size="sm">
																				{formatNumber(position.bondDuration, 2)}
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "coupon":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondCoupon ? (
																		<Tooltip label="Текущий купон">
																			<Text size="sm">
																				{formatNumber(position.bondCoupon, 2)}%
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "bondPrice":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondPrice ? (
																		<Tooltip label="Цена % от номинала">
																			<Text size="sm">
																				{formatNumber(position.bondPrice, 2)}%
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
																	)}
																</Table.Td>
															);

														case "volume":
															return (
																<Table.Td key={col.key} ta="right">
																	{position.bondVolume ? (
																		<Tooltip label="Объем выпуска (млрд)">
																			<Text size="sm">
																				{formatNumber(position.bondVolume, 2)}{" "}
																				млрд
																			</Text>
																		</Tooltip>
																	) : (
																		<Text size="xs" c="dimmed">
																			—
																		</Text>
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

			<AnalysisModal
				opened={analysisModalOpened}
				onClose={() => setAnalysisModalOpened(false)}
				selectedPromptTemplate={selectedPromptTemplate}
				onPromptTemplateChange={setSelectedPromptTemplate}
				rows={sortedRows}
			/>
		</Flex>
	);
}, "PositionsTable");
