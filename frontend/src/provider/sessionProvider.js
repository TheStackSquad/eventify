// frontend/src/provider/sessionProvider.js

"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { verifySessionApi } from "@/services/authAPI";
import { refreshTokenApi } from "@/services/authAPI";
import {
  initializeTokenRefresh,
  clearRefreshTimer,
} from "@/axiosConfig/tokenService";

const IS_DEV = process.env.NODE_ENV === "development";

const debugLog = (category, message, data = {}) => {
  if (!IS_DEV) return;
  const emoji = {
    INIT: "🚀",
    SESSION: "🔐",
    REFRESH: "🔄",
    SUCCESS: "✅",
    ERROR: "❌",
    CLEANUP: "🧹",
  };
  console.log(
    `${emoji[category] || "📋"} [SessionProvider:${category}] ${message}`,
    Object.keys(data).length ? data : "",
  );
};

export const AuthContext = createContext(null);

export default function SessionProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const queryClient = useQueryClient();

  // ================================================================
  // ✅ REFACTORED: SESSION VERIFICATION WITH REFRESH RETRY
  // ================================================================
  const {
    data: sessionData,
    isLoading,
    isFetched,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      debugLog("SESSION", "Verifying session with backend...");

      try {
        // Attempt 1: Verify existing session
        const userData = await verifySessionApi();
        debugLog("SUCCESS", "Session valid", { email: userData.email });
        return userData;
      } catch (error) {
        const status = error.response?.status;

        // ✅ FIX: On 401, attempt token refresh before giving up
        if (status === 401) {
          debugLog("REFRESH", "Session expired, attempting token refresh...");

          try {
            // Attempt 2: Refresh the token
            await refreshTokenApi();
            debugLog("SUCCESS", "Token refreshed, re-verifying session");

            // Attempt 3: Verify session again with new token
            const userData = await verifySessionApi();
            debugLog("SUCCESS", "Session restored after refresh", {
              email: userData.email,
            });
            return userData;
          } catch (refreshError) {
            const refreshStatus = refreshError.response?.status;

            debugLog("ERROR", "Refresh failed", {
              status: refreshStatus,
              code: refreshError.response?.data?.code,
            });

            // Both access token AND refresh token are invalid
            // User needs to re-authenticate
            return null;
          }
        }

        // For 403 or other errors, don't retry
        if (status === 403) {
          debugLog("ERROR", "Access forbidden");
          return null;
        }

        // Network errors or 5xx - throw to trigger retry
        throw error;
      }
    },
    enabled: true,
    retry: (failureCount, error) => {
      // Don't retry on auth failures (handled in queryFn)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // ================================================================
  // SYNC SERVER STATE TO LOCAL STATE
  // ================================================================
  useEffect(() => {
    if (!isFetched) return;

    if (sessionData) {
      debugLog("SUCCESS", "User authenticated", {
        email: sessionData.email,
        isVendor: sessionData.isVendor,
        hasEvents: sessionData.hasEvents,
      });

      setUserState(sessionData);
      setIsAuthenticated(true);

      // Session confirmed - start proactive refresh scheduler
      initializeTokenRefresh();
    } else {
      debugLog("SESSION", "No active session");
      setUserState(null);
      setIsAuthenticated(false);
      clearRefreshTimer();
    }

    setIsInitialized(true);
  }, [sessionData, isFetched]);

  // ================================================================
  // REFRESH EVENT LISTENER
  // ================================================================
  useEffect(() => {
    const handleTokenRefresh = () => {
      debugLog("REFRESH", "Token rotated, invalidating session cache");
      queryClient.invalidateQueries({ queryKey: ["session"] });
    };

    window.addEventListener("tokenRefreshed", handleTokenRefresh);

    return () => {
      window.removeEventListener("tokenRefreshed", handleTokenRefresh);
      clearRefreshTimer();
      debugLog("CLEANUP", "SessionProvider unmounted");
    };
  }, [queryClient]);

  // ================================================================
  // EXPOSED METHODS
  // ================================================================
  const setUser = useCallback(
    (userData) => {
      debugLog("SESSION", "Manual user state update", {
        action: userData ? "login" : "logout",
      });

      setUserState(userData);
      setIsAuthenticated(!!userData);
      queryClient.setQueryData(["session"], userData);

      if (userData) {
        initializeTokenRefresh();
      } else {
        clearRefreshTimer();
      }
    },
    [queryClient],
  );

  const clearAuth = useCallback(() => {
    debugLog("CLEANUP", "Clearing auth state");

    setUserState(null);
    setIsAuthenticated(false);
    queryClient.setQueryData(["session"], null);
    clearRefreshTimer();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isInitialized,
      loading: !isInitialized || (isInitialized && isLoading),
      setUser,
      clearAuth,
      refetchSession,
    }),
    [
      user,
      isAuthenticated,
      isInitialized,
      isLoading,
      setUser,
      clearAuth,
      refetchSession,
    ],
  );

  // ================================================================
  // DEBUG: Log state changes in development
  // ================================================================
  useEffect(() => {
    if (IS_DEV && isInitialized) {
      debugLog("SESSION", "State snapshot", {
        isAuthenticated,
        hasUser: !!user,
        userEmail: user?.email,
      });
    }
  }, [isAuthenticated, user, isInitialized]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
