// ============================================================
// QuickFill — Content Script
// Injected into Google Forms pages to detect and fill form fields
// ============================================================

import type { PlasmoCSConfig } from "plasmo"
import type {
  DetectedField,
  ExtensionMessage,
  SerializableDetectedField
} from "~types"
import { detectFormFields, getFormTitle } from "~lib/formDetector"
import { matchFieldToProfile } from "~lib/fieldMatcher"
import { fillAllFields } from "~lib/formFiller"
import { validateField } from "~lib/validator"
import { getProfile, saveSession } from "~store/profileStore"

export const config: PlasmoCSConfig = {
  matches: ["https://docs.google.com/forms/*"],
  run_at: "document_idle"
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Safely send a message, catching errors when popup is closed */
function safeSendMessage(message: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup may not be open — this is expected
    })
  } catch {
    // Extension context may be invalidated
  }
}

/** Store detected fields globally so we can fill them on confirm */
let currentFields: DetectedField[] = []
let currentFormTitle = ""

/**
 * Wait for the Google Form to fully render by observing DOM mutations.
 */
function waitForFormReady(): Promise<void> {
  return new Promise((resolve) => {
    // Check if form is already loaded
    const formContent =
      document.querySelector('div[role="list"]') ??
      document.querySelector("div.freebirdFormviewerViewItemList")

    if (formContent) {
      resolve()
      return
    }

    // Observe for form loading
    const observer = new MutationObserver((_mutations, obs) => {
      const content =
        document.querySelector('div[role="list"]') ??
        document.querySelector("div.freebirdFormviewerViewItemList")
      if (content) {
        obs.disconnect()
        resolve()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect()
      resolve()
    }, 10000)
  })
}

/**
 * Perform the detection + matching pipeline.
 * Returns serializable field data for the popup preview.
 */
async function runDetectionPipeline(): Promise<SerializableDetectedField[]> {
  const profile = await getProfile()
  if (!profile) {
    safeSendMessage({
      type: "FILL_ERROR",
      error: "No profile saved. Please fill your profile first."
    })
    return []
  }

  // Detect form fields
  const fields = detectFormFields()
  if (fields.length === 0) {
    safeSendMessage({
      type: "FILL_ERROR",
      error: "No form fields detected on this page."
    })
    return []
  }

  // Match each field to a profile key
  for (const field of fields) {
    const match = matchFieldToProfile(field, profile, fields)
    if (match) {
      field.mappedProfileKey = match.key
      field.mappedValue = match.value
      field.confidence = match.confidence

      // Validate the mapped value
      const validation = validateField(match.key, match.value)
      if (!validation.valid) {
        field.validationError = validation.error
      }
    }
  }

  currentFields = fields

  // Return serializable version
  return fields.map((f) => ({
    labelText: f.labelText,
    fieldType: f.fieldType,
    isRequired: f.isRequired,
    options: f.options,
    mappedProfileKey: f.mappedProfileKey,
    mappedValue: f.mappedValue,
    confidence: f.confidence,
    validationError: f.validationError
  }))
}

// ============================================================
// Message listener
// ============================================================

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "TRIGGER_AUTOFILL") {
      runDetectionPipeline()
        .then((fields) => {
          safeSendMessage({
            type: "FILL_PREVIEW",
            fields,
            formTitle: currentFormTitle
          })
          sendResponse({ success: true })
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : "Unknown error"
          safeSendMessage({ type: "FILL_ERROR", error: errorMsg })
          sendResponse({ success: false, error: errorMsg })
        })
      return true // Keep message channel open for async response
    }

    if (message.type === "CONFIRM_FILL") {
      fillAllFields(
        currentFields,
        currentFormTitle,
        (current, total, label) => {
          safeSendMessage({
            type: "FILL_PROGRESS",
            current,
            total,
            fieldLabel: label
          })
        }
      )
        .then(async (session) => {
          await saveSession(session)
          safeSendMessage({ type: "FILL_COMPLETE", session })
          sendResponse({ success: true })
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : "Fill failed"
          safeSendMessage({ type: "FILL_ERROR", error: errorMsg })
          sendResponse({ success: false, error: errorMsg })
        })
      return true
    }

    return false
  }
)

// ============================================================
// Initialize on page load
// ============================================================

async function initialize(): Promise<void> {


  await waitForFormReady()
  await delay(500) // Extra buffer for late-loading elements

  currentFormTitle = getFormTitle()


  safeSendMessage({
    type: "FORM_DETECTED",
    title: currentFormTitle
  })
}

initialize().catch((err) => {
  console.error("[QuickFill] Initialization error:", err)
})
