import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";

export function usePortfolios() {
  const { api } = useAuth();

  return useQuery({
    queryKey: ["portfolios"],
    queryFn: () => api!.portfolios(),
    enabled: !!api,
    staleTime: 1000 * 60 * 2,
  });
}
