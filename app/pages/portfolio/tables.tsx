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

export const PositionsTable = () => {
	const portfolios = usePortfoliosStore((state) => state.portfolios);
	const isEnriched = usePortfoliosStore((state) => state.isEnriched);
	const bondsLoading = useBondsStore((state) => state.isLoading);

	const [showBondRatings, setShowBondRatings] = useState(true);

	const sortRules = ["share", "bond", "etf", "currency"];

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
					bondRating: positionData.bondRating,
					bondYtm: positionData.bondYtm,
					bondMaturity: positionData.bondMaturity,
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

	return (
		<Flex maw={950} direction="column" style={{ margin: "30px auto" }}>
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

				<Badge
					color="blue"
					variant="light"
					size="lg"
					style={{ cursor: 'pointer' }}
					onClick={() => setShowBondRatings(!showBondRatings)}
				>
					{showBondRatings ? 'Скрыть рейтинги' : 'Показать рейтинги'}
				</Badge>
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

						<Paper shadow="xs" radius={12} withBorder>
							<Table highlightOnHover verticalSpacing="md">
								<Table.Thead>
									<Table.Tr>
										<Table.Th>Instrument</Table.Th>
										<Table.Th ta="right">Price</Table.Th>
										<Table.Th ta="right">Value</Table.Th>
										<Table.Th ta="right">Yield</Table.Th>
										{type === 'bond' && showBondRatings && (
											<>
												<Table.Th ta="right">Rating</Table.Th>
												<Table.Th ta="right">YTM</Table.Th>
											</>
										)}
										<Table.Th ta="right">%</Table.Th>
									</Table.Tr>
								</Table.Thead>

								<Table.Tbody>
									{positions.map((position) => (
										<Table.Tr key={position.ticker}>
											<Table.Td>
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

											<Table.Td ta="right">
												<Tooltip label="Средняя → Текущая">
													<Text size="sm">
														{formatPrice(position.averagePrice)} →{" "}
														{formatPrice(position.currentPrice)}
													</Text>
												</Tooltip>
											</Table.Td>

											<Table.Td ta="right">
												<Flex direction="column">
													<Text size="sm">{formatPrice(position.value)}</Text>
													<Text size="xs" c="gray">
														{position.quantity.units} шт
													</Text>
												</Flex>
											</Table.Td>

											<Table.Td ta="right">
												<Badge
													color={getYieldColor(position.expectedYield)}
													variant="light"
												>
													{formatPrice(position.expectedYield)}
												</Badge>
											</Table.Td>

											{type === 'bond' && showBondRatings && (
												<>
													<Table.Td ta="right">
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

													<Table.Td ta="right">
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
												</>
											)}

											<Table.Td ta="right">
												<Text fw={500}>{position.percent.toFixed(2)}%</Text>
											</Table.Td>
										</Table.Tr>
									))}
								</Table.Tbody>
							</Table>
						</Paper>
					</div>
				);
			})}
		</Flex>
	);
};
