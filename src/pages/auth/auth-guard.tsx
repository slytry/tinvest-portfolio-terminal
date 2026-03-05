import type { JSX } from "react";
import { Navigate } from "react-router";
import { isAuthenticated } from "~shared/auth";

export function AuthGuard({ children }: { children: JSX.Element }) {
  if (!isAuthenticated()) {
    return <Navigate replace to="/auth" />;
  }

  return children;
}
