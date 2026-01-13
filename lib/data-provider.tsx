/**
 * Global Data Provider - Real-world pattern
 * Prefetches all user data after login and provides it to tabs via Context
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { fetchAllProjects, fetchUserProfile, fetchTextiles, clearAllCache, Textile, UserProfile } from "@/lib/api";
import { ProjectMeta } from "@/lib/types";
import { useAuthStatus } from "@/lib/auth-store";
import { logger } from "@/lib/logger";

interface DataState {
  // Projects
  ownedProjects: ProjectMeta[];
  collaboratedProjects: ProjectMeta[];
  allProjects: ProjectMeta[];
  
  // Profile
  userProfile: UserProfile | null;
  
  // Textiles (public data)
  textiles: Textile[];
  
  // Loading states
  isLoadingProjects: boolean;
  isLoadingProfile: boolean;
  isLoadingTextiles: boolean;
  
  // Errors
  projectsError: string | null;
  profileError: string | null;
  textilesError: string | null;
  
  // Refresh functions
  refreshProjects: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTextiles: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuthStatus();
  const lastUserIdRef = useRef<string | null>(null);
  
  // Projects state
  const [ownedProjects, setOwnedProjects] = useState<ProjectMeta[]>([]);
  const [collaboratedProjects, setCollaboratedProjects] = useState<ProjectMeta[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  
  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Textiles state
  const [textiles, setTextiles] = useState<Textile[]>([]);
  const [isLoadingTextiles, setIsLoadingTextiles] = useState(false);
  const [textilesError, setTextilesError] = useState<string | null>(null);

  // Fetch projects
  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!user) {
      logger.debug("[DataProvider] Skipping project fetch: user is null");
      return;
    }
    
    try {
      logger.info("[DataProvider] Loading projects for user:", user.id);
      setIsLoadingProjects(true);
      setProjectsError(null);
      
      const tryFetch = async () => fetchAllProjects(user.id, !forceRefresh);

      // Real-world: after SIGNED_IN, storage/session propagation can lag briefly.
      // Retry once on auth-related failures instead of leaving the UI in a bad state.
      let result: Awaited<ReturnType<typeof fetchAllProjects>>;
      try {
        result = await tryFetch();
      } catch (err: any) {
        const message = String(err?.message ?? err ?? "");
        if (message.toLowerCase().includes("not authenticated")) {
          logger.warn("[DataProvider] Projects fetch hit auth lag, retrying once");
          await new Promise((r) => setTimeout(r, 400));
          result = await tryFetch();
        } else {
          throw err;
        }
      }

      const { owned, collaborated } = result;
      
      setOwnedProjects(owned);
      setCollaboratedProjects(collaborated);
      
      logger.info("[DataProvider] Projects loaded successfully", {
        owned: owned.length,
        collaborated: collaborated.length,
      });
    } catch (error: any) {
      logger.error("[DataProvider] Projects error", error?.message || error);
      setProjectsError(error.message || "Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  // Fetch profile
  const loadProfile = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    try {
      setIsLoadingProfile(true);
      setProfileError(null);
      
      const profile = await fetchUserProfile(user.id, !forceRefresh);
      setUserProfile(profile);
      
      logger.debug("[DataProvider] Profile loaded");
    } catch (error: any) {
      logger.error("[DataProvider] Profile error", error);
      setProfileError(error.message || "Failed to load profile");
      
      // Fallback to user metadata
      setUserProfile({
        id: user.id,
        email: user.email ?? "N/A",
        full_name: user.user_metadata?.full_name || "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Fetch textiles (public data, no auth required)
  const loadTextiles = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingTextiles(true);
      setTextilesError(null);
      
      const data = await fetchTextiles(forceRefresh);
      setTextiles(data);
      
      logger.debug("[DataProvider] Textiles loaded", data.length);
    } catch (error: any) {
      logger.error("[DataProvider] Textiles error", error);
      setTextilesError(error.message || "Failed to load textiles");
    } finally {
      setIsLoadingTextiles(false);
    }
  }, []);

  // Refresh functions (force fresh data)
  const refreshProjects = useCallback(() => loadProjects(true), [loadProjects]);
  const refreshProfile = useCallback(() => loadProfile(true), [loadProfile]);
  const refreshTextiles = useCallback(() => loadTextiles(true), [loadTextiles]);
  
  const refreshAll = useCallback(async () => {
    logger.debug("[DataProvider] Refreshing all data");
    await Promise.all([
      loadProjects(true),
      loadProfile(true),
      loadTextiles(true),
    ]);
  }, [loadProjects, loadProfile, loadTextiles]);

  // Initial load when user logs in
  useEffect(() => {
    // Wait for auth restoration to complete so we don't mis-handle startup.
    if (!authReady) return;

    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserIdRef.current;

    // Only react to actual login/logout transitions.
    // This prevents an infinite update loop on cold start when user is null.
    if (previousUserId === currentUserId) return;
    lastUserIdRef.current = currentUserId;

    if (currentUserId) {
      logger.info("[DataProvider] User logged in, prefetching data", { userId: currentUserId });
      loadProjects();
      loadProfile();
      return;
    }

    // Logout transition (was logged in, now null) OR first authReady transition.
    // Clear user-scoped data. Avoid clearing on first-ever startup logged-out.
    if (previousUserId) {
      logger.info("[DataProvider] User logged out, clearing data", { prevUserId: previousUserId });
      setOwnedProjects([]);
      setCollaboratedProjects([]);
      setUserProfile(null);
      void clearAllCache();
    }
  }, [authReady, user, loadProjects, loadProfile]);

  // Load textiles regardless of auth (public data)
  useEffect(() => {
    loadTextiles();
  }, [loadTextiles]);

  // Background refresh every 5 minutes (optional, can be disabled)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      logger.debug("[DataProvider] Background refresh");
      loadProjects(true); // Only projects, profile changes rarely
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, loadProjects]);

  const allProjects = [...ownedProjects, ...collaboratedProjects];

  const value: DataState = {
    ownedProjects,
    collaboratedProjects,
    allProjects,
    userProfile,
    textiles,
    isLoadingProjects,
    isLoadingProfile,
    isLoadingTextiles,
    projectsError,
    profileError,
    textilesError,
    refreshProjects,
    refreshProfile,
    refreshTextiles,
    refreshAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Hook to access global data from any component
 */
export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}
