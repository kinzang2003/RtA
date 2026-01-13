/**
 * Centralized API & Data Fetching Service
 * Real-world pattern: Single source of truth for all API calls
 */

import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProjectMeta } from "@/lib/types";
import { logger } from "@/lib/logger";
import { Image } from "react-native";
import { dzongkhagTextileImageUrls } from "@/constants/textileDzongkhags";

// ============ CACHING UTILITIES ============

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // ms
}

const CACHE_KEYS = {
  TEXTILES: "cache:textiles",
  PROJECTS: "cache:projects",
  PROFILE: "cache:profile",
  DZONGKHAG_MAP_IMAGES: "cache:dzongkhag_map_images",
} as const;

const DZONGKHAG_MAP_IMAGES_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// AsyncStorage on Android is backed by SQLite and can hit size limits.
// Keep cache entries small and resilient.
const MAX_CACHE_CHARS = 200_000; // ~200KB-ish (rough), avoids SQLITE_FULL on larger payloads

function isSqliteFullError(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message)
      : String(error ?? "");
  return message.toLowerCase().includes("sqlite_full") || message.toLowerCase().includes("database or disk is full");
}

function minimizeProjectMeta(projects: ProjectMeta[]): ProjectMeta[] {
  return (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    owner_id: p.owner_id,
    created_at: p.created_at,
    updated_at: p.updated_at,
    access_type: p.access_type,
    thumbnail_url: p.thumbnail_url ?? null,
    // Intentionally omit layers_data / thumbnail_config from list caches
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, context: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      logger.error(`[API] Timeout after ${ms}ms`, { context });
      reject(new Error(`Timeout in ${context}`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;

    if (isExpired) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

async function setCachedData<T>(
  key: string,
  data: T,
  expiresIn: number = 5 * 60 * 1000 // 5 min default
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn,
    };
    const serialized = JSON.stringify(entry);

    // Avoid storing huge values that can break AsyncStorage on Android.
    if (serialized.length > MAX_CACHE_CHARS) {
      logger.warn("[Cache] Skipping cache write (too large)", {
        key,
        chars: serialized.length,
      });
      return;
    }

    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    // If storage is full, clear our cache and skip (or we can retry once for small entries).
    if (isSqliteFullError(error)) {
      logger.warn("[Cache] Storage full; clearing cache", { key });
      await clearAllCache();
      return;
    }

    logger.error("[Cache] Failed to cache", key, error);
  }
}

// ============ TEXTILE API ============

type ImagePrefetchCache = {
  urls: string[];
  okCount: number;
  total: number;
};

/**
 * Prefetch Bhutan map textile images (public bucket) during startup.
 * Uses OS-level image caching via Image.prefetch; we additionally store a small TTL entry
 * in AsyncStorage so we don't aggressively re-prefetch on every cold start.
 */
export async function prefetchDzongkhagMapImages(
  forceRefresh: boolean = false
): Promise<ImagePrefetchCache> {
  const urls = (dzongkhagTextileImageUrls ?? []).filter(Boolean);
  if (urls.length === 0) {
    return { urls: [], okCount: 0, total: 0 };
  }

  if (!forceRefresh) {
    const cached = await getCachedData<ImagePrefetchCache>(CACHE_KEYS.DZONGKHAG_MAP_IMAGES);
    if (cached?.urls?.length) {
      logger.debug("[API] Bhutan map images prefetch skipped (cache valid)");
      return cached;
    }
  }

  // Prefetch in parallel but don't fail the whole call if a single image fails.
  const settled = await Promise.allSettled(urls.map((uri) => Image.prefetch(uri)));
  const okCount = settled.filter((r) => r.status === "fulfilled" && r.value === true).length;

  const result: ImagePrefetchCache = { urls, okCount, total: urls.length };
  await setCachedData(CACHE_KEYS.DZONGKHAG_MAP_IMAGES, result, DZONGKHAG_MAP_IMAGES_TTL_MS);
  logger.debug("[API] Bhutan map images prefetched", result);
  return result;
}

export interface Textile {
  id: string;
  textileName: string;
  origin: string;
  duration: string;
  description: string;
  weavingProcesses: string;
  dateAdded: string;
  status: string;
  image: string;
  motifImage: string;
  symbolismImage: string;
  originImage: string;
  weavingTechniqueImage: string;
  symbolismText: string;
  weavingTechniqueText: string;
  type?: "ENG" | "DZO";
}

/**
 * Fetch textiles with cache-first strategy
 * @param forceRefresh - Skip cache and fetch fresh data
 */
export async function fetchTextiles(
  forceRefresh: boolean = false
): Promise<Textile[]> {
  if (!forceRefresh) {
    const cached = await getCachedData<Textile[]>(CACHE_KEYS.TEXTILES);
    if (cached) {
      logger.debug("[API] Textiles loaded from cache");
      return cached;
    }
  }

  logger.debug("[API] Fetching textiles from Supabase...");
  
  const { data, error } = await supabase
    .from("textiles")
    .select("*")
    .order("date_added", { ascending: false });

  if (error) {
    throw new Error(`Textile fetch failed: ${error.message}`);
  }

  // Map snake_case database fields to camelCase interface
  const textiles: Textile[] = (data ?? []).map((row) => ({
    id: row.id,
    textileName: row.textile_name,
    origin: row.origin,
    duration: row.duration,
    description: row.description,
    weavingProcesses: row.weaving_processes || "",
    dateAdded: row.date_added,
    status: row.status,
    image: row.image,
    motifImage: row.motif_image,
    symbolismImage: row.symbolism_image,
    originImage: row.origin_image,
    weavingTechniqueImage: row.weaving_technique_image,
    symbolismText: row.symbolism_text,
    weavingTechniqueText: row.weaving_technique_text,
    type: row.type as "ENG" | "DZO",
  }));
  
  // Cache for 30 minutes (textiles don't change often)
  await setCachedData(CACHE_KEYS.TEXTILES, textiles, 30 * 60 * 1000);
  
  logger.debug("[API] Textiles fetched & cached", textiles.length);
  return textiles;
}

// ============ PROJECT API ============

/**
 * Fetch owned projects for current user
 */
export async function fetchOwnedProjects(
  userId: string,
  useCache: boolean = true
): Promise<ProjectMeta[]> {
  const cacheKey = `${CACHE_KEYS.PROJECTS}:owned:${userId}`;

  if (useCache) {
    const cached = await getCachedData<ProjectMeta[]>(cacheKey);
    if (cached) {
      logger.debug("[API] Owned projects loaded from cache");
      return cached;
    }
  }

  logger.debug("[API] Fetching owned projects via web API...");

  // Retrieve access token for Authorization header
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (sessionError || !accessToken) {
    logger.error("[API] Missing session for owned projects", { error: sessionError?.message });
    throw new Error("Not authenticated");
  }

  const baseUrl = process.env.EXPO_PUBLIC_WEB_EDITOR_URL;
  if (!baseUrl) {
    logger.error("[API] Missing EXPO_PUBLIC_WEB_EDITOR_URL env");
    throw new Error("Missing web editor URL");
  }

  const projectsUrl = new URL("/api/projects", baseUrl).toString();

  const start = Date.now();
  const resp = await withTimeout(
    fetch(projectsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    15000,
    "owned-projects-web"
  );

  const duration = Date.now() - start;
  logger.info(`[API] Web owned projects fetch in ${duration}ms`);

  if (!resp.ok) {
    const text = await resp.text();
    logger.error("[API] Web owned projects error", { status: resp.status, text });
    throw new Error(text || `Failed with status ${resp.status}`);
  }

  const payload = await resp.json();
  const projects: ProjectMeta[] = (payload?.owned ?? []) as ProjectMeta[];
  const toCache = minimizeProjectMeta(projects).slice(0, 100);

  // Cache for 2 minutes
  await setCachedData(cacheKey, toCache, 2 * 60 * 1000);

  return projects;
}

/**
 * Fetch collaborated projects for current user
 */
export async function fetchCollaboratedProjects(
  userId: string,
  useCache: boolean = true
): Promise<ProjectMeta[]> {
  const cacheKey = `${CACHE_KEYS.PROJECTS}:collaborated:${userId}`;

  if (useCache) {
    const cached = await getCachedData<ProjectMeta[]>(cacheKey);
    if (cached) {
      logger.debug("[API] Collaborated projects loaded from cache");
      return cached;
    }
  }

  logger.debug("[API] Fetching collaborated projects via web API...");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (sessionError || !accessToken) {
    logger.error("[API] Missing session for collaborated projects", { error: sessionError?.message });
    throw new Error("Not authenticated");
  }

  const baseUrl = process.env.EXPO_PUBLIC_WEB_EDITOR_URL;
  if (!baseUrl) {
    logger.error("[API] Missing EXPO_PUBLIC_WEB_EDITOR_URL env");
    throw new Error("Missing web editor URL");
  }

  const projectsUrl = new URL("/api/projects", baseUrl).toString();

  const start = Date.now();
  const resp = await withTimeout(
    fetch(projectsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    15000,
    "collaborated-projects-web"
  );

  const duration = Date.now() - start;
  logger.info(`[API] Web collaborated projects fetch in ${duration}ms`);

  if (!resp.ok) {
    const text = await resp.text();
    logger.error("[API] Web collaborated projects error", { status: resp.status, text });
    throw new Error(text || `Failed with status ${resp.status}`);
  }

  const payload = await resp.json();
  const projects = (payload?.collaborated ?? []) as ProjectMeta[];
  const toCache = minimizeProjectMeta(projects).slice(0, 100);

  // Cache for 2 minutes
  await setCachedData(cacheKey, toCache, 2 * 60 * 1000);

  return projects;
}

/**
 * Fetch all projects (owned + collaborated) - matches web naming
 */
export async function fetchAllProjects(
  userId: string,
  useCache: boolean = true
): Promise<{
  owned: ProjectMeta[];
  collaborated: ProjectMeta[];
  all: ProjectMeta[];
}> {
  logger.debug("[API] Fetching all projects");

  const [owned, collaborated] = await Promise.all([
    fetchOwnedProjects(userId, useCache),
    fetchCollaboratedProjects(userId, useCache),
  ]);

  return {
    owned,
    collaborated,
    all: [...owned, ...collaborated],
  };
}

/**
 * Fetch single project by ID
 */
export async function fetchProjectById(projectId: string): Promise<any> {
  logger.debug("[API] Fetching project");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    logger.error("[API] fetchProjectById error", {
      code: (error as any).code,
      message: error.message,
    });
    throw error;
  }
  if (!data) throw new Error("Project not found");

  return data;
}

// ============ PROFILE API ============

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string | null;
}

/**
 * Fetch user profile with cache
 */
export async function fetchUserProfile(
  userId: string,
  useCache: boolean = true
): Promise<UserProfile> {
  const cacheKey = `${CACHE_KEYS.PROFILE}:${userId}`;

  if (useCache) {
    const cached = await getCachedData<UserProfile>(cacheKey);
    if (cached) {
      logger.debug("[API] Profile loaded from cache");
      return cached;
    }
  }

  logger.debug("[API] Fetching user profile...");
  const startTime = Date.now();
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", userId)
    .single();

  const duration = Date.now() - startTime;
  logger.info("[API] Profile query completed in " + duration + "ms", { error: error?.message });

  if (error) {
    logger.error("[API] Profile fetch error", { code: error.code, message: error.message, userId });
    
    if (error.code === "PGRST116") {
      // Profile doesn't exist, create it
      const { data: user, error: userError } = await supabase.auth.getUser();
      logger.debug("[API] getUser result", { hasUser: !!user.user, error: userError?.message });
      
      if (!user.user) {
        logger.error("[API] User not authenticated when creating profile", { userId, userError });
        throw new Error("User not authenticated");
      }

      const newProfile: UserProfile = {
        id: userId,
        email: user.user.email ?? "N/A",
        full_name: user.user.user_metadata?.full_name || "",
        avatar_url: user.user.user_metadata?.avatar_url || null,
      };

      // Try to insert
      await supabase.from("profiles").insert(newProfile);

      // Cache and return
      await setCachedData(cacheKey, newProfile, 10 * 60 * 1000);
      return newProfile;
    }
    throw error;
  }

  const profile: UserProfile = {
    id: data.id,
    email: data.email,
    full_name: data.full_name || "",
    avatar_url: data.avatar_url || null,
  };

  // Cache for 10 minutes
  await setCachedData(cacheKey, profile, 10 * 60 * 1000);

  return profile;
}

// ============ CACHE INVALIDATION ============

/**
 * Clear all cached data (e.g., on logout)
 */
export async function clearAllCache(): Promise<void> {
  try {
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // IMPORTANT: Never remove Supabase auth keys (usually `sb-*`) here.
    // This function is called during app init when `user` can be temporarily null
    // while the session is still restoring. Removing `sb-*` would effectively sign
    // users out even if they didn't explicitly log out.
    const cacheKeysToRemove = allKeys.filter((key) => key.startsWith("cache:"));
    
    if (cacheKeysToRemove.length > 0) {
      await AsyncStorage.multiRemove(cacheKeysToRemove);
    }
    
    logger.info("[API] All cache cleared", { count: cacheKeysToRemove.length });
  } catch (error) {
    logger.error("[API] Failed to clear cache:", error);
  }
}

/**
 * Clear specific cache
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    logger.info(`[API] Cache cleared: ${key}`);
  } catch (error) {
    logger.error(`[API] Failed to clear cache ${key}:`, error);
  }
}
