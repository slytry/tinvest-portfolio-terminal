import { Badge, Loader, Table } from "@mantine/core";
import type { Quotation } from "@tinkoff/invest-js-grpc-web";
import { useEffect } from "react";
import { usePortfoliosStore } from "~/api/portfolios";
import { useRenderCount } from "~/utils/use-render-cnt";

const formatPrice = (value?: Quotation) => {
	if (!value) {
		return 0;
	}
	return (value.units + value.nano / 1_000_000_000).toFixed(2);
};

const getYieldColor = (yield_?: Quotation) => {
	if (!yield_) {
		return "dark";
	}
	const total = yield_.units + yield_.nano / 1_000_000_000;
	if (total > 0) return "green";
	if (total < 0) return "red";
	return "gray";
};

const PositionsTable = () => {
	const portfolios = usePortfoliosStore((state) => state.portfolios);

	if (!portfolios) {
		return null;
	}

	const allPositions = portfolios.flatMap((portfolioData) =>
		portfolioData.positions.map((positionData) => ({
			accountName: positionData.accountName,
			instrumentName: positionData.instrument.instrument?.name,
			instrumentType: positionData.instrument.instrument?.instrumentType,
			ticker: positionData.instrument.instrument?.ticker,
			quantity: positionData.position.quantity,
			averagePrice: positionData.position.averagePositionPrice,
			currentPrice: positionData.position.currentPrice,
			expectedYield: positionData.position.expectedYield,
			currency: positionData.position.averagePositionPrice?.currency || "rub",
			currentNkd: positionData.position.currentNkd,
		})),
	);

	const rows = allPositions.map((position) => (
		<Table.Tr key={`${position.accountName}-${position.ticker}`}>
			<Table.Td>
				<Badge size="sm" variant="light">
					{position.accountName}
				</Badge>
			</Table.Td>
			<Table.Td>{position.instrumentName}</Table.Td>
			<Table.Td>
				<Badge size="xs" variant="outline">
					{position.instrumentType}
				</Badge>
			</Table.Td>
			<Table.Td>{position.ticker}</Table.Td>
			<Table.Td align="right">{formatPrice(position.quantity)}</Table.Td>
			<Table.Td align="right">
				{formatPrice(position.averagePrice)} {position.currency}
			</Table.Td>
			<Table.Td align="right">
				{formatPrice(position.currentPrice)} {position.currency}
			</Table.Td>
			<Table.Td align="right">
				<Badge color={getYieldColor(position.expectedYield)} variant="light">
					{formatPrice(position.expectedYield)} {position.currency}
				</Badge>
			</Table.Td>
			{position.currentNkd && (
				<Table.Td align="right">
					{formatPrice(position.currentNkd)} {position.currentNkd.currency}
				</Table.Td>
			)}
		</Table.Tr>
	));

	return (
		<Table striped highlightOnHover withTableBorder withColumnBorders>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Account</Table.Th>
					<Table.Th>Instrument</Table.Th>
					<Table.Th>Type</Table.Th>
					<Table.Th>Ticker</Table.Th>
					<Table.Th>Quantity</Table.Th>
					<Table.Th>Avg Price</Table.Th>
					<Table.Th>Current Price</Table.Th>
					<Table.Th>Expected Yield</Table.Th>
					<Table.Th>NKD (if bond)</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>{rows}</Table.Tbody>
		</Table>
	);
};

export default function PortfolioPage() {
	const renderCnt = useRenderCount();
	console.log("🚀 ~ PortfolioPage ~ renderCnt:", renderCnt);

	const isLoading = usePortfoliosStore((state) => state.isLoading);
	const fetchPortfolios = usePortfoliosStore((state) => state.fetchPortfolios);

	useEffect(() => {
		fetchPortfolios();
	}, [fetchPortfolios]);

	if (isLoading) {
		return <Loader />;
	}

	return <PositionsTable />;
}
