/** biome-ignore-all lint/style/noNonNullAssertion: yes */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: yes */
import {
	Avatar,
	Badge,
	Box,
	CopyButton,
	Flex,
	Modal,
	Paper,
	RingProgress,
	Select,
	Table,
	Textarea,
	Text,
	Title,
	Tooltip,
	Checkbox,
	Popover,
	Button,
	Stack,
} from "@mantine/core";
import { reatomComponent } from "@reatom/react";
import { useState } from "react";
import { bondsIsLoadingAtom, bondsMapAtom } from "~/api/bonds/store";
import { getRatingColor } from "~/api/bonds/types";
import { portfoliosAtom, portfoliosIsEnrichedAtom } from "~/api/portfolios";
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

// Типы для настроек колонок - ТЕПЕРЬ ДЛЯ ВСЕХ ТИПОВ
interface ColumnConfig {
	key: string;
	label: string;
	enabled: boolean;
	type?: string; // для фильтрации по типу инструмента
}

type PromptTemplate = {
	key: string;
	label: string;
	template: string;
};

const PROMPT_TEMPLATES: PromptTemplate[] = [
	{
		key: "full-bond-analysis",
		label: "Полный анализ облигационного портфеля",
		template: `Выступай как профессиональный портфельный менеджер и аналитик рынка облигаций с опытом управления институциональными портфелями.

Я дам тебе список облигаций из моего портфеля. Проведи комплексный анализ.

1. Общий анализ портфеля
- оцени качество портфеля
- определи уровень риска (низкий / средний / высокий)
- оцени диверсификацию
- выяви концентрации риска (страна, сектор, валюта, эмитент)

2. Кредитный риск
Для каждой облигации:
- оцени вероятность дефолта
- прокомментируй кредитное качество эмитента
- укажи ключевые риски эмитента

3. Процентный риск
- оцени чувствительность портфеля к изменению процентных ставок
- что будет с портфелем если ставки вырастут на:
  - +1%
  - +2%
  - +3%

4. Сценарный анализ
Опиши как поведет себя портфель в сценариях:

Сценарий 1 — глобальная рецессия
Сценарий 2 — рост инфляции
Сценарий 3 — резкое повышение ставок центральными банками
Сценарий 4 — финансовый кризис
Сценарий 5 — сильный экономический рост

5. Диверсификация
Оцени диверсификацию по:
- странам
- валютам
- секторам
- срокам погашения
- рейтингу

Укажи:
- где есть перекос
- какие риски плохо диверсифицированы

6. Структура портфеля
Проанализируй:
- среднюю дюрацию
- среднюю доходность
- распределение по срокам
- долю high yield и investment grade

7. Рекомендации
Дай конкретные рекомендации:
- какие риски сократить
- какие типы облигаций добавить
- какие страны / сектора могут улучшить диверсификацию
- какие доли портфеля оптимальны

8. Улучшение портфеля
Предложи пример более устойчивого портфеля облигаций:
- с лучшей диверсификацией
- с контролируемым риском
- с хорошей доходностью

9. Краткое резюме
В конце дай:
- ключевые риски
- сильные стороны портфеля
- 3 главные рекомендации

Вот мой портфель:

{{portfolio}}

Дополнительно:

- оцени worst case сценарий
- оцени Value at Risk портфеля
- оцени корреляцию рисков
- предложи хеджирование
- предложи долю cash или short duration bonds`,
	},
	{
		key: "quick-risk-check",
		label: "Быстрый риск-чек",
		template: `Сделай краткий риск-анализ этого портфеля облигаций.

Требования:
1. Ключевые риски (топ-5)
2. Качество диверсификации
3. Слабые места по срокам/валютам/эмитентам
4. Что улучшить прямо сейчас (3 конкретных шага)

Портфель:

{{portfolio}}`,
	},
];

export const PositionsTable = reatomComponent(() => {
	const portfolios = portfoliosAtom();
	const isEnriched = portfoliosIsEnrichedAtom();
	const bondsLoading = bondsIsLoadingAtom();
	const bondsMap = bondsMapAtom();

	const [columnsPopoverOpened, setColumnsPopoverOpened] = useState(false);
	const [analysisModalOpened, setAnalysisModalOpened] = useState(false);
	const [selectedPromptTemplate, setSelectedPromptTemplate] = useState(
		PROMPT_TEMPLATES[0].key,
	);

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

			const rawName = portfolioData.positions[0]?.accountName;
			const accountName = rawName && rawName.trim().length > 0
				? rawName
				: `Счёт #${index + 1}`;

			return {
				id: `${index}`,
				accountName,
				positionsByType,
			};
		}) ?? [];

	const [selectedPortfolio, setSelectedPortfolio] = useState(
		portfoliosWithGroupedPositions[0]?.id,
	);

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

	const csvEscape = (value: string) => {
		const escaped = value.replace(/"/g, "\"\"");
		return `"${escaped}"`;
	};

	const formatQuantity = (quantity: any): string => {
		const raw = moneyToNumber(quantity);
		const digits = Number.isInteger(raw) ? 0 : 4;
		return formatNumber(raw, digits);
	};

	const buildPortfolioForPrompt = () => {
		const rows = sortRules.flatMap((type) =>
			positionsWithValue
				.filter((p) => p.instrumentType === type)
				.sort((a, b) => b.percent - a.percent),
		);

		return rows
			.map((position, index) => {
				const yieldValue = position.bondYtm
					? `${formatNumber(position.bondYtm, 1)}%`
					: formatPrice(position.expectedYield);

				return `${index + 1}. ${position.instrumentName || "-"}
ISIN: ${position.isin || "-"}
доля: ${position.percent.toFixed(2)}%
цена покупки: ${formatPrice(position.averagePrice)}
текущая цена: ${formatPrice(position.currentPrice)}
колличесво: ${formatQuantity(position.quantity)}
доходность: ${yieldValue}
погашение: ${position.bondMaturity || "-"}
валюта: ${(position.currency || "-").toUpperCase()}

---`;
			})
			.join("\n\n");
	};

	const getAnalysisPrompt = () => {
		const template = PROMPT_TEMPLATES.find((t) => t.key === selectedPromptTemplate);
		if (!template) return "";
		return template.template.replace("{{portfolio}}", buildPortfolioForPrompt());
	};

	const exportCurrentTableToCsv = () => {
		const rows = sortRules.flatMap((type) =>
			positionsWithValue
				.filter((p) => p.instrumentType === type)
				.sort((a, b) => b.percent - a.percent),
		);

		if (!rows.length) return;

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
				formatPrice(position.currentPrice),
				formatQuantity(position.quantity),
			]
				.map((value) => csvEscape(String(value)))
				.join(";"),
		);

		const csv = [header, ...csvRows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		const date = new Date().toISOString().slice(0, 10);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`portfolio_${portfolio.accountName.replace(/\s+/g, "_")}_${date}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<Flex maw={1400} direction="column" style={{ margin: "30px auto" }}>
			<Flex justify="space-between" align="center">
				<Select
					label="Accounts"
					data={portfoliosWithGroupedPositions.map((p) => ({
						label: p.accountName,
						value: p.id,
					}))}
					value={selectedPortfolio}
					onChange={(v) => setSelectedPortfolio(v!)}
					mb="lg"
					maw={300}
				/>

				<Flex gap="sm">
					<Button
						variant="light"
						size="sm"
						onClick={() => setAnalysisModalOpened(true)}
					>
						Анализ портфеля
					</Button>

					<Button
						variant="light"
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

			<Modal
				opened={analysisModalOpened}
				onClose={() => setAnalysisModalOpened(false)}
				title="Промпт для анализа портфеля"
				size="xl"
			>
				<Stack>
					<Select
						label="Шаблон промпта"
						data={PROMPT_TEMPLATES.map((template) => ({
							value: template.key,
							label: template.label,
						}))}
						value={selectedPromptTemplate}
						onChange={(value) =>
							setSelectedPromptTemplate(value || PROMPT_TEMPLATES[0].key)
						}
					/>

					<Textarea
						label="Готовый промпт"
						minRows={18}
						autosize
						value={getAnalysisPrompt()}
						readOnly
					/>

					<Flex justify="space-between" align="center">
						<Text size="xs" c="dimmed">
							В промпт подставлен текущий выбранный портфель.
						</Text>

						<CopyButton value={getAnalysisPrompt()} timeout={1200}>
							{({ copied, copy }) => (
								<Button size="sm" onClick={copy}>
									{copied ? "Скопировано" : "Копировать промпт"}
								</Button>
							)}
						</CopyButton>
					</Flex>
				</Stack>
			</Modal>
		</Flex>
	);
}, "PositionsTable");
