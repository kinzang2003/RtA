/**
 * Global Data Provider - Real-world pattern
 * Prefetches all user data after login and provides it to tabs via Context
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchAllProjects, fetchUserProfile, fetchTextiles, clearAllCache, Textile, UserProfile } from "./api";
import { ProjectMeta } from "./types";
import { useAuthUser } from "./auth-store";
import { logger } from "./logger";

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
  const user = useAuthUser();
  
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
    if (!user) return;
    
    try {
      setIsLoadingProjects(true);
      setProjectsError(null);
      
      const { owned, collaborated } = await fetchAllProjects(user.id, !forceRefresh);
      
      setOwnedProjects(owned);
      setCollaboratedProjects(collaborated);
      
      logger.debug("[DataProvider] Projects loaded", {
        owned: owned.length,
        collaborated: collaborated.length,
      });
    } catch (error: any) {
      logger.error("[DataProvider] Projects error", error);
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
    if (user) {
      logger.info("[DataProvider] User logged in, prefetching data");
      loadProjects();
      loadProfile();
    } else {
      // Clear data on logout
      logger.info("[DataProvider] User logged out, clearing data");
      setOwnedProjects([]);
      setCollaboratedProjects([]);
      setUserProfile(null);
      clearAllCache();
    }
  }, [user, loadProjects, loadProfile]);

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
