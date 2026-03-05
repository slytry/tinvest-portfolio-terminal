import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/portfolio.tsx"),
  route("auth", "routes/auth.tsx"),
] satisfies RouteConfig;
