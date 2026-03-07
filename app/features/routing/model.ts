import { reatomRoute, urlAtom } from "@reatom/core";

export const portfolioRoute = reatomRoute("", "portfolioRoute");
export const authRoute = reatomRoute("auth", "authRoute");

export const initRouting = urlAtom.init;
