import type { PortfolioResponse } from "@tinkoff/invest-js-grpc-web";
import { useMemo, useState } from "react";

type Props = {
  portfolios: PortfolioResponse[];
  title?: string;
  showSummaryCards?: boolean;
};

export const PortfolioViewer = ({
  portfolios,
  title = "Инвестиционные портфели",
  showSummaryCards = true,
}: Props) => {
  console.log(portfolios);

  return null;
};
