import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { RouteError } from "./components/error-boundary";
import { MemberLayout, RootLayout, TabLayout } from "./components/layouts";
import { RouteGuardMember, RouteGuardOwner } from "./components/route-guards";
import { AuthProvider } from "./hooks/use-auth";
// The two screens everyone opens first are in the main bundle; the rest load on demand.
import BarPage from "./pages/bar-page";
import SignInPage from "./pages/sign-in-page";
import { ROUTES } from "./routes";

const ActivityPage = lazy(() => import("./pages/activity-page"));
const AddCapsulePage = lazy(() => import("./pages/add-capsule-page"));
const CapsulePage = lazy(() => import("./pages/capsule-page"));
const CheersPage = lazy(() => import("./pages/cheers-page"));
const ExpiringPage = lazy(() => import("./pages/expiring-page"));
const GuestLinkPage = lazy(() => import("./pages/guest-link-page"));
const ManagePage = lazy(() => import("./pages/manage-page"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Realtime keeps counts current while the app is open; this bounds how stale a
      // screen can be after the phone wakes and the socket hasn't reconnected yet.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// A data router (not <BrowserRouter>) for <ScrollRestoration />: back from a capsule should
// land on the same spot in the grid.
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />} errorElement={<RouteError />}>
      <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
      <Route
        element={
          <RouteGuardMember>
            <MemberLayout />
          </RouteGuardMember>
        }
      >
        <Route element={<TabLayout />}>
          <Route path={ROUTES.BAR} element={<BarPage />} />
          <Route path={ROUTES.ACTIVITY} element={<ActivityPage />} />
          <Route
            path={ROUTES.MANAGE}
            element={
              <RouteGuardOwner>
                <ManagePage />
              </RouteGuardOwner>
            }
          />
        </Route>
        <Route path={`${ROUTES.CAPSULE}/:capsuleId`} element={<CapsulePage />} />
        <Route path={ROUTES.CHEERS} element={<CheersPage />} />
        <Route
          path={ROUTES.MANAGE_ADD}
          element={
            <RouteGuardOwner>
              <AddCapsulePage />
            </RouteGuardOwner>
          }
        />
        <Route
          path={ROUTES.MANAGE_GUEST_LINK}
          element={
            <RouteGuardOwner>
              <GuestLinkPage />
            </RouteGuardOwner>
          }
        />
        <Route
          path={ROUTES.MANAGE_EXPIRING}
          element={
            <RouteGuardOwner>
              <ExpiringPage />
            </RouteGuardOwner>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.BAR} replace />} />
    </Route>,
  ),
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
