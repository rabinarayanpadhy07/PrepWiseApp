import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useMemo, useState } from "react";

import { logout as logoutRequest, refreshSession } from "@/lib/api/auth";
import { clearSession, onSessionEvent, setAccessToken } from "@/lib/auth/session";
import { clearAllDrafts } from "@/lib/drafts";

const AuthContext = createContext(null);

/**
 * Holds the signed-in user. On load it tries to restore the session from the
 * HttpOnly refresh cookie; nothing about the session is read from storage.
 *
 * status: "loading" | "authenticated" | "anonymous"
 */
function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ status: "loading", user: null, expired: false });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((data) => active && setState({ status: "authenticated", user: data.user, expired: false }))
      .catch(() => active && setState({ status: "anonymous", user: null, expired: false }));
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      onSessionEvent((event) => {
        if (event.type === "refreshed") {
          setState({ status: "authenticated", user: event.user, expired: false });
        } else if (event.type === "expired") {
          queryClient.clear();
          setState({ status: "anonymous", user: null, expired: true });
        }
      }),
    [queryClient],
  );

  const value = useMemo(
    () => ({
      ...state,
      isAdmin: state.user?.role === "admin",
      /** Call with the { access, user } returned by login, register, or password change. */
      startSession(session) {
        setAccessToken(session.access);
        setState({ status: "authenticated", user: session.user, expired: false });
      },
      updateUser(user) {
        setState((current) => ({ ...current, user }));
      },
      async signOut() {
        try {
          await logoutRequest();
        } catch {
          // The local session is cleared regardless; the cookie expires on its own.
        } finally {
          clearSession();
          clearAllDrafts();
          queryClient.clear();
          setState({ status: "anonymous", user: null, expired: false });
        }
      },
    }),
    [state, queryClient],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}

export { AuthContext, AuthProvider, useAuth };
