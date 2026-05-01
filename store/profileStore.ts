// ============================================================
// QuickFill — Storage Layer
// CRUD helpers using @plasmohq/storage
// Handles cross-browser persistence automatically
// ============================================================

import { Storage } from "@plasmohq/storage"
import type {
  FillSession,
  StudentProfile
} from "~types"

const storage = new Storage()

const STORAGE_KEYS = {
  PROFILE: "quickfill_profile",
  PROFILE_DRAFT: "quickfill_profile_draft",
  LAST_SESSION: "quickfill_last_session",
  PROFILE_UPDATED_AT: "quickfill_profile_updated_at"
} as const

// ============================================================
// Profile CRUD
// ============================================================

/** Retrieve the saved student profile, or null if not found */
export async function getProfile(): Promise<StudentProfile | null> {
  try {
    const profile = await storage.get<StudentProfile>(STORAGE_KEYS.PROFILE)
    if (profile && typeof profile === "object") {
      return profile
    }
    return null
  } catch (error) {
    console.error("[QuickFill] Failed to get profile:", error)
    return null
  }
}

/** Save the student profile to storage */
export async function saveProfile(profile: StudentProfile): Promise<void> {
  try {
    await storage.set(STORAGE_KEYS.PROFILE, profile)
    await storage.set(STORAGE_KEYS.PROFILE_UPDATED_AT, Date.now())
  } catch (error) {
    console.error("[QuickFill] Failed to save profile:", error)
    throw new Error("Failed to save profile to storage")
  }
}

// ============================================================
// Profile Draft Helpers
// ============================================================

/** Get the current profile draft if it exists */
export async function getProfileDraft(): Promise<StudentProfile | null> {
  try {
    const draft = await storage.get<StudentProfile>(STORAGE_KEYS.PROFILE_DRAFT)
    if (draft && typeof draft === "object") {
      return draft
    }
    return null
  } catch {
    return null
  }
}

/** Save a temporary draft of the profile */
export async function saveProfileDraft(profile: StudentProfile): Promise<void> {
  try {
    await storage.set(STORAGE_KEYS.PROFILE_DRAFT, profile)
  } catch {}
}

/** Clear the profile draft */
export async function clearProfileDraft(): Promise<void> {
  try {
    await storage.remove(STORAGE_KEYS.PROFILE_DRAFT)
  } catch {}
}

/** Get the timestamp of the last profile update */
export async function getProfileUpdatedAt(): Promise<number | null> {
  try {
    const timestamp = await storage.get<number>(STORAGE_KEYS.PROFILE_UPDATED_AT)
    if (typeof timestamp === "number") {
      return timestamp
    }
    return null
  } catch (error) {
    console.error("[QuickFill] Failed to get profile timestamp:", error)
    return null
  }
}


// ============================================================
// Fill Session CRUD
// ============================================================

/** Get the last fill session */
export async function getLastSession(): Promise<FillSession | null> {
  try {
    const session = await storage.get<FillSession>(STORAGE_KEYS.LAST_SESSION)
    if (session && typeof session === "object") {
      return session
    }
    return null
  } catch (error) {
    console.error("[QuickFill] Failed to get last session:", error)
    return null
  }
}

/** Save a fill session */
export async function saveSession(session: FillSession): Promise<void> {
  try {
    await storage.set(STORAGE_KEYS.LAST_SESSION, session)
  } catch (error) {
    console.error("[QuickFill] Failed to save session:", error)
    throw new Error("Failed to save session to storage")
  }
}
