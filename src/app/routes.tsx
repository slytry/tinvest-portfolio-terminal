import { createBrowserRouter, redirect } from "react-router";
import { AuthPage } from "~pages/auth";
import { PortfolioPage } from "~pages/portfolio";
import { getToken } from "~shared/auth";

function authLoader() {
  const token = getToken();

  if (token) {
    return redirect("/portfolio");
  }

  return null;
}

function protectedLoader() {
  const token = getToken();

  if (!token) {
    return redirect("/auth");
  }

  return null;
}

export const router = createBrowserRouter([
  {
    path: "/auth",
    loader: authLoader,
    element: <AuthPage />,
  },
  {
    path: "/",
    loader: protectedLoader,
    element: <PortfolioPage />,
  },
]);
