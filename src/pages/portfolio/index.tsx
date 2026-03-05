import { PortfolioViewer } from "./content";
import { usePortfolios } from "./usePortfolios";

export default function PortfolioPage() {
  const { data, isLoading } = usePortfolios();

  if (isLoading) {
    return <div>Loading portfolio...</div>;
  }

  return <PortfolioViewer portfolios={data ?? []} />;
}
