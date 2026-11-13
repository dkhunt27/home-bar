import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, joinBar } from "../lib/db/session-db";
import { QK } from "../lib/query-keys";
import { supabase } from "../lib/supabase";
import type { JoinBarStatusType, MeType } from "../types";

interface AuthContextType {
  session: Session | null;
  /** The signed-in bar member, or null: signed out, or signed in but not let in yet (an
   *  anonymous session that hasn't entered the right code). */
  me: MeType | null;
  isOwner: boolean;
  /** True until we know whether there's a session and, if so, who it is. */
  loading: boolean;
  /** Set when a magic link signed in someone who isn't the owner; the sign-in screen shows it. */
  authError: string | null;
  clearAuthError: () => void;
  /** Guest entry: anonymous session (reused if there is one) + the guest link's key. */
  joinAsGuest: (name: string, key: string) => Promise<JoinBarStatusType>;
  /** Owner entry: emails a magic link that lands back on the app root. Only to an existing
   *  user, so the form can't be used to mail strangers. */
  sendOwnerLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Fires INITIAL_SESSION first (after any magic-link session in the URL is picked up),
    // so this alone answers "is anyone signed in?". Only sync work in here: supabase-js
    // deadlocks if the callback awaits another auth call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoading(false);
      // supabase-js strips the magic-link tokens from the URL but leaves a bare "#" (which
      // location.hash reports as "", hence the href check).
      if (window.location.href.endsWith("#")) {
        const { pathname, search } = window.location;
        window.history.replaceState(window.history.state, "", `${pathname}${search}`);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const meQuery = useQuery({
    queryKey: QK.me(userId),
    queryFn: getMe,
    enabled: !!userId,
  });
  const me = userId ? (meQuery.data ?? null) : null;
  const loading = sessionLoading || (!!userId && meQuery.isPending);

  // A magic link makes you the owner only if it went to the owner's address. Anyone else
  // gets signed straight back out, with a reason.
  useEffect(() => {
    if (session && !session.user.is_anonymous && meQuery.isSuccess && meQuery.data === null) {
      setAuthError("That email isn't set up as this bar's owner.");
      void supabase.auth.signOut();
    }
  }, [session, meQuery.isSuccess, meQuery.data]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const joinAsGuest = useCallback(
    async (name: string, key: string) => {
      setAuthError(null);
      let {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (!current) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        current = data.session;
      }
      const status = await joinBar(name, key);
      // The me query may already be in flight from the anonymous sign-in, about to answer
      // "nobody". Invalidating cancels that and refetches now that we're a guest.
      if (status === "ok" && current) {
        await queryClient.invalidateQueries({ queryKey: QK.me(current.user.id) });
      }
      return status;
    },
    [queryClient],
  );

  const sendOwnerLink = useCallback(async (email: string) => {
    setAuthError(null);
    // shouldCreateUser: false, or any address typed here would get a new user and an email.
    // An unknown address fails with otp_disabled instead (sign-in-page.tsx says so).
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      me,
      isOwner: me?.role === "owner",
      loading,
      authError,
      clearAuthError,
      joinAsGuest,
      sendOwnerLink,
      signOut,
    }),
    [session, me, loading, authError, clearAuthError, joinAsGuest, sendOwnerLink, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
