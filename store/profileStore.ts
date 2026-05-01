// ============================================================
// QuickFill — Storage Layer
// CRUD helpers using chrome.storage.local
// Never uses localStorage — all data persists via chrome.storage
// ============================================================

import type {
  FillSession,
  StudentProfile
} from "~types"

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
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE)
    const profile = result[STORAGE_KEYS.PROFILE] as unknown
    if (profile && typeof profile === "object") {
      return profile as StudentProfile
    }
    return null
  } catch (error) {
    console.error("[QuickFill] Failed to get profile:", error)
    return null
  }
}

/** Save the student profile to chrome.storage.local */
export async function saveProfile(profile: StudentProfile): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROFILE]: profile,
      [STORAGE_KEYS.PROFILE_UPDATED_AT]: Date.now()
    })
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
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE_DRAFT)
    const draft = result[STORAGE_KEYS.PROFILE_DRAFT] as unknown
    if (draft && typeof draft === "object") {
      return draft as StudentProfile
    }
    return null
  } catch {
    return null
  }
}

/** Save a temporary draft of the profile */
export async function saveProfileDraft(profile: StudentProfile): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PROFILE_DRAFT]: profile
    })
  } catch {}
}

/** Clear the profile draft */
export async function clearProfileDraft(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.PROFILE_DRAFT)
  } catch {}
}

/** Get the timestamp of the last profile update */
export async function getProfileUpdatedAt(): Promise<number | null> {
  try {
    const result = await chrome.storage.local.get(
      STORAGE_KEYS.PROFILE_UPDATED_AT
    )
    const timestamp = result[STORAGE_KEYS.PROFILE_UPDATED_AT] as unknown
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
    const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SESSION)
    const session = result[STORAGE_KEYS.LAST_SESSION] as unknown
    if (session && typeof session === "object") {
      return session as FillSession
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
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_SESSION]: session
    })
  } catch (error) {
    console.error("[QuickFill] Failed to save session:", error)
    throw new Error("Failed to save session to storage")
  }
}
