import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { useBarRealtime } from "../hooks/use-bar-realtime";
import { BottomNav } from "./bottom-nav";
import { Loading } from "./loading";
import { PwaUpdatePrompt } from "./pwa-update-prompt";

/** Every route: the centered phone column. ScrollRestoration puts the Bar back where it was
 * when you come back from a capsule. */
export function RootLayout() {
  return (
    <div className="app-column">
      <ScrollRestoration />
      <PwaUpdatePrompt />
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

/** Signed-in routes: live counts for as long as someone's in the bar. */
export function MemberLayout() {
  useBarRealtime();
  return <Outlet />;
}

/** Bar, Activity, Manage: the three screens with the tab bar. */
export function TabLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
