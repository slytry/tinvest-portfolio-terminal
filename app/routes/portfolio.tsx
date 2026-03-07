/** biome-ignore-all lint/style/noNonNullAssertion: yes */
import { Loader } from "@mantine/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect } from "react";
import {
	fetchPortfolios,
	portfoliosIsLoadingAtom,
} from "~/api/portfolios";
import { PositionsTable } from "~/pages/portfolio/tables";

const PortfolioPage = reatomComponent(() => {
	const isLoading = portfoliosIsLoadingAtom();
	const runFetchPortfolios = useWrap(fetchPortfolios, "runFetchPortfolios");

	useEffect(() => {
		runFetchPortfolios();
	}, [runFetchPortfolios]);

	if (isLoading) {
		return <Loader />;
	}

	return <PositionsTable />;
}, "PortfolioPage");

export default PortfolioPage;
