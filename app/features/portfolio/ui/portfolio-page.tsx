/** biome-ignore-all lint/style/noNonNullAssertion: yes */
import { Paper, Skeleton, Stack } from "@mantine/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect } from "react";
import { fetchPortfolios, portfoliosIsLoadingAtom } from "~/api/portfolios";
import { PositionsTable } from "./positions-table";

function PortfolioPageSkeleton() {
	return (
		<Stack gap="md">
			<Paper p="md" radius="lg" withBorder>
				<Stack gap="sm">
					<Skeleton height={16} radius="sm" w={180} />
					<Skeleton height={38} radius="md" w={320} />
				</Stack>
			</Paper>
			<Skeleton height={28} radius="sm" w={260} />
			<Skeleton height={42} radius="xl" />
			<Skeleton height={180} radius="xl" />
			<Skeleton height={420} radius="lg" />
		</Stack>
	);
}

export const PortfolioPage = reatomComponent(() => {
	const isLoading = portfoliosIsLoadingAtom();
	const runFetchPortfolios = useWrap(fetchPortfolios, "runFetchPortfolios");

	useEffect(() => {
		runFetchPortfolios();
	}, [runFetchPortfolios]);

	if (isLoading) {
		return <PortfolioPageSkeleton />;
	}

	return <PositionsTable />;
}, "PortfolioPage");
