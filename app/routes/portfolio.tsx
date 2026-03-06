/** biome-ignore-all lint/style/noNonNullAssertion: yes */
import { Loader } from "@mantine/core";
import { useEffect } from "react";
import { usePortfoliosStore } from "~/api/portfolios";
import { PositionsTable } from "~/pages/portfolio/tables";

export default function PortfolioPage() {
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
