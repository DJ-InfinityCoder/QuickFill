// ============================================================
// QuickFill — Form Detector
// Detects and parses Google Form fields from the DOM
// Google Forms frequently updates DOM structure — all selectors
// have fallbacks for resilience
// ============================================================

import type { DetectedField, FormFieldType } from "~types"

// ============================================================
// Selector constants (with fallbacks for different GForms versions)
// ============================================================

/** Selectors for question containers in Google Forms */
const QUESTION_CONTAINER_SELECTORS = [
  'div[role="listitem"]', // Standard Google Forms question container
  "div.Qr7Oae", // Alternative class-based selector
  "div.freebirdFormviewerComponentsQuestionBaseRoot", // Older Forms version
  "div.geS5n" // Another common container class
]

/** Selectors for question labels/headings */
const LABEL_SELECTORS = [
  'div[role="heading"] span.M7eMe', // Standard label span
  "div.M7eMe", // Fallback label class
  "span.M7eMe", // Direct span selector
  "div.freebirdFormviewerComponentsQuestionBaseTitle", // Older version
  '[data-params] div[role="heading"]' // Data-params based fallback
]

/** Selectors for text input fields */
const TEXT_INPUT_SELECTORS = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="url"]',
  'input[type="date"]',
  "input.whsOnd", // Google Forms input class
  'input[aria-labelledby]'
]

/** Selectors for textarea fields */
const TEXTAREA_SELECTORS = [
  "textarea",
  "textarea.KHxj8b", // Google Forms textarea class
  'textarea[aria-labelledby]'
]

/** Selectors for dropdown (listbox) fields */
const DROPDOWN_SELECTORS = [
  'div[role="listbox"]',
  "div.MocG8c", // Google Forms dropdown class
  'div[aria-haspopup="listbox"]'
]

/** Selectors for dropdown options */
const DROPDOWN_OPTION_SELECTORS = [
  'div[role="option"]', // Standard option role
  'div[data-value]', // Data-value options
  "div.MocG8c div.vRMGwf" // Class-based options
]

/** Selectors for radio button groups */
const RADIO_GROUP_SELECTORS = [
  'div[role="radiogroup"]',
  "div.SG0AAe", // Google Forms radio group class
  'div[role="list"]'
]

/** Selectors for individual radio buttons */
const RADIO_SELECTORS = [
  'div[role="radio"]',
  'label[role="radio"]',
  "div.nWQGrd" // Google Forms radio class
]

/** Selectors for checkbox groups */
const CHECKBOX_GROUP_SELECTORS = [
  'div[role="group"]',
  "div.SG0AAe" // Shared class with radio in some versions
]

/** Selectors for individual checkboxes */
const CHECKBOX_SELECTORS = [
  'div[role="checkbox"]',
  'label[role="checkbox"]'
]

// ============================================================
// Helper: safe querySelector with fallback selectors
// ============================================================

function queryWithFallback(
  parent: Element | Document,
  selectors: string[]
): Element | null {
  for (const selector of selectors) {
    try {
      const el = parent.querySelector(selector)
      if (el) return el
    } catch {
      // Invalid selector — skip
    }
  }
  return null
}

function queryAllWithFallback(
  parent: Element | Document,
  selectors: string[]
): Element[] {
  for (const selector of selectors) {
    try {
      const elements = parent.querySelectorAll(selector)
      if (elements.length > 0) return Array.from(elements)
    } catch {
      // Invalid selector — skip
    }
  }
  return []
}

// ============================================================
// Field type detection
// ============================================================

interface FieldDetectionResult {
  element: HTMLElement
  fieldType: FormFieldType
  options?: string[]
}

function detectFieldType(container: Element): FieldDetectionResult | null {
  // Check for dropdown (listbox) first
  const dropdown = queryWithFallback(container, DROPDOWN_SELECTORS)
  if (dropdown) {
    const optionElements = queryAllWithFallback(container, DROPDOWN_OPTION_SELECTORS)
    const options = optionElements
      .map((opt) => opt.textContent?.trim() ?? "")
      .filter((text) => text.length > 0 && text !== "Choose")
    return {
      element: dropdown as HTMLElement,
      fieldType: "dropdown",
      options
    }
  }

  // Check for radio buttons
  const radioGroup = queryWithFallback(container, RADIO_GROUP_SELECTORS)
  if (radioGroup) {
    const radioElements = queryAllWithFallback(container, RADIO_SELECTORS)
    if (radioElements.length > 0) {
      const options = radioElements
        .map((radio) => {
          // Try aria-label first, then inner text
          const label =
            radio.getAttribute("aria-label") ??
            radio.textContent?.trim() ??
            ""
          return label
        })
        .filter((text) => text.length > 0)
      return {
        element: radioGroup as HTMLElement,
        fieldType: "radio",
        options
      }
    }
  }

  // Check for checkboxes
  const checkboxGroup = queryWithFallback(container, CHECKBOX_GROUP_SELECTORS)
  if (checkboxGroup) {
    const checkboxElements = queryAllWithFallback(container, CHECKBOX_SELECTORS)
    if (checkboxElements.length > 0) {
      const options = checkboxElements
        .map((cb) => {
          return (
            cb.getAttribute("aria-label") ?? cb.textContent?.trim() ?? ""
          )
        })
        .filter((text) => text.length > 0)
      return {
        element: checkboxGroup as HTMLElement,
        fieldType: "checkbox",
        options
      }
    }
  }

  // Check for textarea
  const textarea = queryWithFallback(container, TEXTAREA_SELECTORS)
  if (textarea) {
    return {
      element: textarea as HTMLElement,
      fieldType: "textarea"
    }
  }

  // Check for input fields (text, email, number, url, date)
  for (const selector of TEXT_INPUT_SELECTORS) {
    try {
      const input = container.querySelector(selector) as HTMLInputElement | null
      if (input) {
        const inputType = input.getAttribute("type") ?? "text"
        let fieldType: FormFieldType = "text"
        switch (inputType) {
          case "email":
            fieldType = "email"
            break
          case "number":
            fieldType = "number"
            break
          case "url":
            fieldType = "url"
            break
          case "date":
            fieldType = "date"
            break
          default:
            fieldType = "text"
            break
        }
        return {
          element: input as HTMLElement,
          fieldType
        }
      }
    } catch {
      // Skip invalid selector
    }
  }

  return null
}

// ============================================================
// Required field detection
// ============================================================

function isFieldRequired(container: Element, labelText: string): boolean {
  // Check if label contains asterisk (standard Google Forms required indicator)
  if (labelText.includes("*")) return true

  // Check for aria-required attribute on any child element
  try {
    const ariaRequired = container.querySelector('[aria-required="true"]')
    if (ariaRequired) return true
  } catch {
    // Skip
  }

  // Check for required indicator span
  try {
    const requiredSpan = container.querySelector(
      "span.vnumgf" // Google Forms required asterisk class
    )
    if (requiredSpan) return true
  } catch {
    // Skip
  }

  return false
}

// ============================================================
// Main detection function
// ============================================================

/**
 * Scans the current Google Form page and returns an array of detected fields
 * with their types, labels, and required status.
 */
export function detectFormFields(): DetectedField[] {
  const detectedFields: DetectedField[] = []

  // Find all question containers
  const containers = queryAllWithFallback(
    document,
    QUESTION_CONTAINER_SELECTORS
  )

  if (containers.length === 0) {
    console.warn("[QuickFill] No question containers found on this page")
    return detectedFields
  }

  for (const container of containers) {
    try {
      // Extract label text
      const labelElement = queryWithFallback(container, LABEL_SELECTORS)
      const labelText = labelElement?.textContent?.trim() ?? ""

      if (!labelText) continue // Skip fields without labels

      // Detect field type and element
      const detection = detectFieldType(container)
      if (!detection) continue // Skip unrecognized fields

      // Determine if required
      const isRequired = isFieldRequired(container, labelText)

      // Clean label text (remove asterisk)
      const cleanLabel = labelText.replace(/\s*\*\s*$/, "").trim()

      const field: DetectedField = {
        element: detection.element,
        labelText: cleanLabel,
        fieldType: detection.fieldType,
        isRequired,
        options: detection.options,
        confidence: 0
      }

      detectedFields.push(field)
    } catch (error) {
      console.error(
        "[QuickFill] Error detecting field in container:",
        error
      )
    }
  }

  console.log(
    `[QuickFill] Detected ${detectedFields.length} fields`,
    detectedFields.map((f) => `${f.labelText} (${f.fieldType})`)
  )

  return detectedFields
}

/**
 * Extracts the form title from the Google Forms page header
 */
export function getFormTitle(): string {
  const titleSelectors = [
    "div.freebirdFormviewerViewHeaderHeader h1", // Standard title element
    'div[role="heading"][aria-level="1"]', // ARIA heading
    "div.freebirdFormviewerViewHeaderTitle", // Older version
    'div.ahS2Le span[dir="auto"]' // Alternative title container
  ]

  for (const selector of titleSelectors) {
    try {
      const el = document.querySelector(selector)
      if (el?.textContent?.trim()) {
        return el.textContent.trim()
      }
    } catch {
      // Skip
    }
  }

  return document.title || "Unknown Form"
}
