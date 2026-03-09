import {
	Badge,
	Button,
	Group,
	MultiSelect,
	Paper,
	ScrollArea,
	SegmentedControl,
	SimpleGrid,
	Skeleton,
	Stack,
	Table,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
	fetchOperationsByCursorAll,
	type HistoryDisplayType,
	type HistoryOperation,
	type HistoryPeriodPreset,
	type OperationCategory,
	periodFromPreset,
} from "~/api/history";
import { fetchPortfolios, portfoliosAtom } from "~/api/portfolios";
import { readSnapshots } from "../lib/snapshots";

type DisplayPoint = { ts: string; value: number };

type HistoryFilters = {
	selectedAccounts: string[];
	periodPreset: HistoryPeriodPreset;
	displayType: HistoryDisplayType;
	customFrom: string;
	customTo: string;
	operationCategories: OperationCategory[];
};

const SETTINGS_KEY = "history_ui_settings_v1";

const DEFAULT_FILTERS: HistoryFilters = {
	selectedAccounts: [],
	periodPreset: "1m",
	displayType: "value",
	customFrom: "",
	customTo: "",
	operationCategories: [],
};

const CATEGORY_OPTIONS: { value: OperationCategory; label: string }[] = [
	{ value: "deposit", label: "Пополнение" },
	{ value: "withdraw", label: "Вывод" },
	{ value: "fees", label: "Комиссии" },
	{ value: "taxes", label: "Налоги" },
	{ value: "dividends", label: "Дивиденды" },
	{ value: "coupons", label: "Купоны" },
	{ value: "trades", label: "Сделки" },
	{ value: "other", label: "Прочее" },
];

const toNumber = (value?: { units: number; nano: number } | null) =>
	value ? value.units + value.nano / 1_000_000_000 : 0;

const fmtMoney = (value: number) =>
	new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(value);

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");
const isValidDate = (value: Date) => !Number.isNaN(value.getTime());
const parseDateInput = (value: string, endOfDay = false) => {
	if (!value) return null;
	const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
	return isValidDate(date) ? date : null;
};

const typeToRu = (t: HistoryOperation["category"]) => {
	switch (t) {
		case "deposit":
			return "Пополнение";
		case "withdraw":
			return "Вывод";
		case "fees":
			return "Комиссии";
		case "taxes":
			return "Налоги";
		case "dividends":
			return "Дивиденды";
		case "coupons":
			return "Купоны";
		case "trades":
			return "Сделки";
		default:
			return "Прочее";
	}
};

function MiniLineChart({
	points,
	displayType,
}: {
	points: DisplayPoint[];
	displayType: HistoryDisplayType;
}) {
	if (points.length < 2) {
		return (
			<Paper withBorder radius="md" p="md">
				<Text size="sm" c="dimmed">
					Недостаточно snapshot-данных для графика. История начнёт накапливаться
					после следующих обновлений портфеля.
				</Text>
			</Paper>
		);
	}

	const width = 920;
	const height = 280;
	const min = Math.min(...points.map((p) => p.value));
	const max = Math.max(...points.map((p) => p.value));
	const range = Math.max(max - min, 1);

	const poly = points
		.map((p, i) => {
			const x = (i / (points.length - 1)) * width;
			const y = height - ((p.value - min) / range) * height;
			return `${x},${y}`;
		})
		.join(" ");

	const first = points[0]?.value || 0;
	const last = points[points.length - 1]?.value || 0;
	const delta = last - first;
	const deltaText =
		displayType === "return" ? `${delta.toFixed(2)}%` : fmtMoney(delta);

	return (
		<Paper withBorder radius="md" p="md">
			<Group justify="space-between" mb="xs">
				<Text size="sm" c="dimmed">
					{displayType === "value"
						? "Стоимость портфеля"
						: displayType === "pnl"
							? "Прибыль / Убыток"
							: "Доходность %"}
				</Text>
				<Badge color={delta >= 0 ? "green" : "red"} variant="light">
					Δ {deltaText}
				</Badge>
			</Group>
			<svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
				<polyline
					points={poly}
					fill="none"
					stroke="var(--mantine-color-blue-5)"
					strokeWidth={3}
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			</svg>
			<Group justify="space-between" mt="xs">
				<Text size="xs" c="dimmed">
					{fmtDate(points[0].ts)}
				</Text>
				<Text size="xs" c="dimmed">
					{fmtDate(points[points.length - 1].ts)}
				</Text>
			</Group>
		</Paper>
	);
}

const readStoredFilters = (): HistoryFilters => {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return DEFAULT_FILTERS;
		const parsed = JSON.parse(raw) as Partial<HistoryFilters>;
		return {
			...DEFAULT_FILTERS,
			...parsed,
			selectedAccounts: Array.isArray(parsed.selectedAccounts)
				? parsed.selectedAccounts
				: [],
			operationCategories: Array.isArray(parsed.operationCategories)
				? (parsed.operationCategories as OperationCategory[])
				: [],
		};
	} catch {
		return DEFAULT_FILTERS;
	}
};

const persistFilters = (filters: HistoryFilters) => {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(filters));
};

export const HistoryPage = reatomComponent(() => {
	const portfolios = portfoliosAtom();
	const runFetchPortfolios = useWrap(
		fetchPortfolios,
		"runFetchPortfoliosHistory",
	);
	const [isPending, startTransition] = useTransition();

	const [draftFilters, setDraftFilters] =
		useState<HistoryFilters>(DEFAULT_FILTERS);
	const [appliedFilters, setAppliedFilters] =
		useState<HistoryFilters>(DEFAULT_FILTERS);
	const [operations, setOperations] = useState<HistoryOperation[]>([]);
	const [isLoadingOps, setIsLoadingOps] = useState(false);
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		runFetchPortfolios();
	}, [runFetchPortfolios]);

	useEffect(() => {
		const stored = readStoredFilters();
		setDraftFilters(stored);
		setAppliedFilters(stored);
		setIsHydrated(true);
	}, []);

	const accountOptions = useMemo(
		() =>
			(portfolios || []).map((p) => {
				const id = p.portfolio.accountId || p.positions[0]?.accountId || "";
				const name = p.positions[0]?.accountName || id;
				return { value: id, label: name };
			}),
		[portfolios],
	);

	useEffect(() => {
		if (!isHydrated || !accountOptions.length) return;
		if (draftFilters.selectedAccounts.length) return;

		const all = accountOptions.map((a) => a.value);
		const next = { ...draftFilters, selectedAccounts: all };
		setDraftFilters(next);
		setAppliedFilters(next);
		persistFilters(next);
	}, [accountOptions, draftFilters, isHydrated]);

	useEffect(() => {
		if (!isHydrated) return;
		persistFilters(draftFilters);
	}, [draftFilters, isHydrated]);

	const { from, to } = useMemo(() => {
		if (appliedFilters.periodPreset === "custom") {
			const customFrom = parseDateInput(appliedFilters.customFrom, false);
			const customTo = parseDateInput(appliedFilters.customTo, true);
			if (customFrom && customTo) {
				return customFrom <= customTo
					? { from: customFrom, to: customTo }
					: { from: customTo, to: customFrom };
			}
			return periodFromPreset("1m");
		}
		return periodFromPreset(appliedFilters.periodPreset);
	}, [
		appliedFilters.periodPreset,
		appliedFilters.customFrom,
		appliedFilters.customTo,
	]);

	const allSnapshots = useMemo(() => readSnapshots(), [portfolios?.length]);

	const snapshots = useMemo(() => {
		const selected = new Set(appliedFilters.selectedAccounts);
		const grouped = new Map<string, number>();

		for (const s of allSnapshots) {
			if (selected.size && !selected.has(s.accountId)) continue;
			if (new Date(s.timestamp) < from || new Date(s.timestamp) > to) continue;
			const day = s.timestamp.slice(0, 10);
			grouped.set(day, (grouped.get(day) || 0) + s.portfolioValue);
		}

		const points = Array.from(grouped.entries())
			.map(([day, value]) => ({ ts: `${day}T00:00:00.000Z`, value }))
			.sort((a, b) => a.ts.localeCompare(b.ts));

		const baseline = points[0]?.value || 0;
		if (appliedFilters.displayType === "pnl") {
			return points.map((p) => ({ ...p, value: p.value - baseline }));
		}
		if (appliedFilters.displayType === "return") {
			return points.map((p) => ({
				...p,
				value: baseline ? ((p.value - baseline) / baseline) * 100 : 0,
			}));
		}
		return points;
	}, [
		allSnapshots,
		appliedFilters.selectedAccounts,
		appliedFilters.displayType,
		from,
		to,
	]);

	const currentPortfolioMetrics = useMemo(() => {
		if (!portfolios) {
			return { value: 0, investedBase: 0, profit: 0, returnPct: 0 };
		}

		const selected = new Set(appliedFilters.selectedAccounts);
		let value = 0;
		let investedBase = 0;

		for (const account of portfolios) {
			const accountId =
				account.portfolio.accountId || account.positions[0]?.accountId || "";
			if (!selected.has(accountId)) continue;

			const accountValue = toNumber(account.portfolio.totalAmountPortfolio);
			const relativeYieldPct = toNumber(account.portfolio.expectedYield);
			const safeDenominator = 1 + relativeYieldPct / 100;
			const accountInvestedBase =
				safeDenominator > 0.01 ? accountValue / safeDenominator : accountValue;

			value += accountValue;
			investedBase += accountInvestedBase;
		}

		const profit = value - investedBase;
		const returnPct = investedBase > 0 ? (profit / investedBase) * 100 : 0;

		return { value, investedBase, profit, returnPct };
	}, [portfolios, appliedFilters.selectedAccounts]);

	const loadOperations = useWrap(
		async (accountIds: string[], fromDate: Date, toDate: Date) => {
			if (!accountIds.length) {
				setOperations([]);
				return;
			}
			setIsLoadingOps(true);
			try {
				const data = await fetchOperationsByCursorAll(
					accountIds,
					fromDate,
					toDate,
				);
				startTransition(() => {
					setOperations(data);
				});
			} catch {
				startTransition(() => {
					setOperations([]);
				});
			} finally {
				setIsLoadingOps(false);
			}
		},
		"loadHistoryOperations",
	);

	useEffect(() => {
		loadOperations(appliedFilters.selectedAccounts, from, to);
	}, [
		loadOperations,
		from.getTime(),
		to.getTime(),
		appliedFilters.selectedAccounts.join(","),
	]);

	const filteredOperations = useMemo(() => {
		if (!appliedFilters.operationCategories.length) return operations;
		const set = new Set(appliedFilters.operationCategories);
		return operations.filter((o) => set.has(o.category));
	}, [operations, appliedFilters.operationCategories]);

	const visibleOperations = useMemo(
		() => filteredOperations.slice(0, 500),
		[filteredOperations],
	);

	const totals = useMemo(() => {
		const sumBy = (category: HistoryOperation["category"]) =>
			operations
				.filter((o) => o.category === category)
				.reduce((sum, o) => sum + o.amount, 0);

		const invested = sumBy("deposit");
		const withdrawn = Math.abs(sumBy("withdraw"));
		const fees = operations.reduce((sum, o) => sum + o.commission, 0);
		const taxes = Math.abs(sumBy("taxes"));
		const dividends = sumBy("dividends");
		const coupons = sumBy("coupons");
		const netCashFlow = invested - withdrawn;

		return {
			invested,
			withdrawn,
			fees,
			taxes,
			dividends,
			coupons,
			netCashFlow,
		};
	}, [operations]);

	const displaySummary = useMemo(() => {
		if (appliedFilters.displayType === "pnl") {
			return {
				label: "Текущий P/L",
				value: fmtMoney(currentPortfolioMetrics.profit),
				delta: `${currentPortfolioMetrics.returnPct.toFixed(2)}%`,
				positive: currentPortfolioMetrics.profit >= 0,
			};
		}
		if (appliedFilters.displayType === "return") {
			return {
				label: "Текущая доходность",
				value: `${currentPortfolioMetrics.returnPct.toFixed(2)}%`,
				delta: fmtMoney(currentPortfolioMetrics.profit),
				positive: currentPortfolioMetrics.returnPct >= 0,
			};
		}
		return {
			label: "Текущая стоимость",
			value: fmtMoney(currentPortfolioMetrics.value),
			delta: fmtMoney(currentPortfolioMetrics.profit),
			positive: currentPortfolioMetrics.profit >= 0,
		};
	}, [appliedFilters.displayType, currentPortfolioMetrics]);

	const applyFilters = () => {
		setAppliedFilters(draftFilters);
		persistFilters(draftFilters);
	};

	return (
		<Stack gap="md">
			<Title order={2}>История портфеля</Title>
			<Text size="sm" c="dimmed">
				Динамика стоимости, операции и денежные потоки по выбранным счетам.
			</Text>

			<Paper withBorder radius="lg" p="md">
				<Stack gap="sm">
					<Group grow align="end">
						<MultiSelect
							label="Портфели"
							placeholder="Выберите счета"
							data={accountOptions}
							value={draftFilters.selectedAccounts}
							size="sm"
							onChange={(selectedAccounts) =>
								setDraftFilters((prev) => ({ ...prev, selectedAccounts }))
							}
						/>
						<SegmentedControl
							size="sm"
							fullWidth
							data={[
								{ label: "1 день", value: "1d" },
								{ label: "1 нед", value: "1w" },
								{ label: "1 мес", value: "1m" },
								{ label: "6 мес", value: "6m" },
								{ label: "1 год", value: "1y" },
								{ label: "За все время", value: "all" },
								{ label: "Custom", value: "custom" },
							]}
							value={draftFilters.periodPreset}
							onChange={(periodPreset) =>
								setDraftFilters((prev) => ({
									...prev,
									periodPreset: periodPreset as HistoryPeriodPreset,
								}))
							}
						/>
					</Group>

					{draftFilters.periodPreset === "custom" && (
						<Group grow align="end">
							<TextInput
								type="date"
								label="От"
								value={draftFilters.customFrom}
								size="sm"
								onChange={(e) => {
									const value = e.currentTarget.value;
									setDraftFilters((prev) => ({
										...prev,
										customFrom: value,
									}));
								}}
							/>
							<TextInput
								type="date"
								label="До"
								value={draftFilters.customTo}
								size="sm"
								onChange={(e) => {
									const value = e.currentTarget.value;
									setDraftFilters((prev) => ({
										...prev,
										customTo: value,
									}));
								}}
							/>
						</Group>
					)}

					<Group justify="space-between" align="end">
						<SegmentedControl
							size="sm"
							data={[
								{ label: "Стоимость", value: "value" },
								{ label: "P/L", value: "pnl" },
								{ label: "Доходность %", value: "return" },
							]}
							value={draftFilters.displayType}
							onChange={(displayType) => {
								const next = {
									...draftFilters,
									displayType: displayType as HistoryDisplayType,
								};
								setDraftFilters(next);
								setAppliedFilters((prev) => ({
									...prev,
									displayType: displayType as HistoryDisplayType,
								}));
								persistFilters(next);
							}}
						/>
						<Button h={36} onClick={applyFilters} loading={isLoadingOps}>
							Применить
						</Button>
					</Group>
				</Stack>
			</Paper>

			<MiniLineChart
				points={snapshots}
				displayType={appliedFilters.displayType}
			/>

			<Paper withBorder radius="md" p="sm">
				<Group justify="space-between" align="center">
					<Text size="xs" c="dimmed">
						{displaySummary.label}
					</Text>
					<Badge
						color={displaySummary.positive ? "green" : "red"}
						variant="light"
					>
						Δ {displaySummary.delta}
					</Badge>
				</Group>
				<Text fw={800} size="xl" mt={4}>
					{displaySummary.value}
				</Text>
			</Paper>

			<SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Всего пополнено
					</Text>
					<Text fw={700}>{fmtMoney(totals.invested)}</Text>
				</Paper>
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Всего выведено
					</Text>
					<Text fw={700}>{fmtMoney(totals.withdrawn)}</Text>
				</Paper>
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Всего комиссий
					</Text>
					<Text fw={700}>{fmtMoney(totals.fees)}</Text>
				</Paper>
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Всего налогов
					</Text>
					<Text fw={700}>{fmtMoney(totals.taxes)}</Text>
				</Paper>
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Дивиденды + купоны
					</Text>
					<Text fw={700}>{fmtMoney(totals.dividends + totals.coupons)}</Text>
				</Paper>
			</SimpleGrid>

			<SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Net cash flow
					</Text>
					<Text fw={700}>{fmtMoney(totals.netCashFlow)}</Text>
				</Paper>
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Текущая стоимость
					</Text>
					<Text fw={700}>{fmtMoney(currentPortfolioMetrics.value)}</Text>
				</Paper>
				<Paper withBorder radius="md" p="sm">
					<Text size="xs" c="dimmed">
						Общая прибыль / Доходность
					</Text>
					<Text fw={700}>
						{fmtMoney(currentPortfolioMetrics.profit)} (
						{currentPortfolioMetrics.returnPct.toFixed(2)}%)
					</Text>
				</Paper>
			</SimpleGrid>

			<Paper withBorder radius="lg" p="md">
				<Group justify="space-between" mb="sm" align="end">
					<Title order={4}>Cash Flow / Operations History</Title>
					<Group align="end" gap="sm">
						<MultiSelect
							label="Типы операций"
							placeholder="Все типы"
							data={CATEGORY_OPTIONS}
							value={draftFilters.operationCategories}
							size="sm"
							onChange={(operationCategories) =>
								setDraftFilters((prev) => ({
									...prev,
									operationCategories:
										operationCategories as OperationCategory[],
								}))
							}
							w={320}
						/>
						<Button
							variant="default"
							h={36}
							mb={1}
							onClick={applyFilters}
							loading={isLoadingOps}
						>
							Применить
						</Button>
					</Group>
				</Group>

				{isLoadingOps || isPending ? (
					<Stack>
						<Skeleton h={36} />
						<Skeleton h={36} />
						<Skeleton h={36} />
					</Stack>
				) : (
					<>
						<Text size="xs" c="dimmed" mb="xs">
							Показано {visibleOperations.length} из {filteredOperations.length}{" "}
							операций.
						</Text>
						<ScrollArea h={420}>
							<Table striped highlightOnHover>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Дата</Table.Th>
										<Table.Th>Тип</Table.Th>
										<Table.Th>Операция</Table.Th>
										<Table.Th>Инструмент</Table.Th>
										<Table.Th ta="right">Сумма</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{visibleOperations.map((op) => (
										<Table.Tr key={`${op.accountId}-${op.id}-${op.date}`}>
											<Table.Td>
												{new Date(op.date).toLocaleString("ru-RU")}
											</Table.Td>
											<Table.Td>
												<Badge variant="light">{typeToRu(op.category)}</Badge>
											</Table.Td>
											<Table.Td>{op.name}</Table.Td>
											<Table.Td>{op.instrument || "-"}</Table.Td>
											<Table.Td ta="right">{fmtMoney(op.amount)}</Table.Td>
										</Table.Tr>
									))}
								</Table.Tbody>
							</Table>
						</ScrollArea>
					</>
				)}
			</Paper>
		</Stack>
	);
}, "HistoryPage");
