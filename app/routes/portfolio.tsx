import { useEffect, useMemo, useState } from "react";
import { PortfolioViewer } from "~/components/portfolio";
import { type AccountPortfolio, createApi } from "~/shared/api";
import type { Route } from "./+types/portfolio";

export default function PortfolioPage() {
  const token = localStorage.getItem("token") || "";
  console.log(token);

  const api = createApi(token);

  const [data, setData] = useState<AccountPortfolio[]>(null!);

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const res = await api.portfolios();
        const val = res.map(({ portfolio }) => portfolio);

        setData(val);
      } catch (err) {
        console.error("Ошибка загрузки портфеля", err);
      }
    };

    fetchPortfolios();
  }, []);
  return (
    <div>
      {/*<h1>{token}</h1>*/}
      {data && <PortfolioViewer portfolios={data} />}
    </div>
  );
}
