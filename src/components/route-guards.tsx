import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { ROUTES } from "../routes";
import { Loading } from "./loading";

/** Owner or guest. Anyone else goes to sign in, and comes back here afterwards. */
export function RouteGuardMember({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!me) {
    return <Navigate to={ROUTES.SIGN_IN} state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

/** Manage and Add. A guest who lands here just sees the bar. */
export function RouteGuardOwner({ children }: { children: ReactNode }) {
  const { isOwner } = useAuth();
  if (!isOwner) return <Navigate to={ROUTES.BAR} replace />;
  return <>{children}</>;
}
