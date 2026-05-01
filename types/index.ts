// ============================================================
// QuickFill — Type Definitions
// All interfaces used across the extension
// ============================================================

/** Represents a student's complete profile for placement form filling */
export interface StudentProfile {
  // Personal Information
  fullName: string
  firstName: string
  middleName: string
  lastName: string
  email: string
  collegeEmail: string
  phone: string
  dob: string // stored as "DD/MM/YYYY"

  // Academic Information
  rollNumber: string
  course: "B.Tech" | "M.Tech" | "PhD" | string
  branch: string
  graduationYear: string
  cgpa: string
  tenthPercentage: string
  tenthPassingYear: string
  twelfthPercentage: string
  twelfthPassingYear: string
  activeBacklog: boolean
  backlogCount: string

  // Documents
  resumeLink: string
}

/** Supported field types in Google Forms */
export type FormFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "url"
  | "textarea"

/** A single detected field from a Google Form */
export interface DetectedField {
  /** The DOM element of the field input */
  element: HTMLElement
  /** The label text extracted from the form question */
  labelText: string
  /** The type of form field detected */
  fieldType: FormFieldType
  /** Whether this field is marked as required */
  isRequired: boolean
  /** Available options for dropdown/radio/checkbox fields */
  options?: string[]
  /** The matched StudentProfile key, if any */
  mappedProfileKey?: keyof StudentProfile
  /** The value that will be filled into this field */
  mappedValue?: string | number | boolean
  /** Confidence score of the match (0.0 to 1.0) */
  confidence: number
  /** Validation error message, if validation fails */
  validationError?: string
}

/** Serializable version of DetectedField for message passing (no HTMLElement) */
export interface SerializableDetectedField {
  labelText: string
  fieldType: FormFieldType
  isRequired: boolean
  options?: string[]
  mappedProfileKey?: keyof StudentProfile
  mappedValue?: string | number | boolean
  confidence: number
  validationError?: string
}

/** Result of a form fill session */
export interface FillSession {
  formTitle: string
  detectedFields: SerializableDetectedField[]
  filledCount: number
  skippedCount: number
  errorCount: number
  timestamp: number
}

// ============================================================
// Message types for chrome.runtime messaging
// ============================================================

export interface FormDetectedMessage {
  type: "FORM_DETECTED"
  title: string
}

export interface TriggerAutofillMessage {
  type: "TRIGGER_AUTOFILL"
}

export interface FillPreviewMessage {
  type: "FILL_PREVIEW"
  fields: SerializableDetectedField[]
  formTitle: string
}

export interface ConfirmFillMessage {
  type: "CONFIRM_FILL"
}

export interface FillCompleteMessage {
  type: "FILL_COMPLETE"
  session: FillSession
}

export interface FillProgressMessage {
  type: "FILL_PROGRESS"
  current: number
  total: number
  fieldLabel: string
}

export interface FillErrorMessage {
  type: "FILL_ERROR"
  error: string
}

export type ExtensionMessage =
  | FormDetectedMessage
  | TriggerAutofillMessage
  | FillPreviewMessage
  | ConfirmFillMessage
  | FillCompleteMessage
  | FillProgressMessage
  | FillErrorMessage

// ============================================================
// Utility types
// ============================================================

/** Keys of StudentProfile that hold string values */
export type StringProfileKey = {
  [K in keyof StudentProfile]: StudentProfile[K] extends string ? K : never
}[keyof StudentProfile]

/** Keys of StudentProfile that hold numeric values */
export type NumericProfileKey = {
  [K in keyof StudentProfile]: StudentProfile[K] extends number ? K : never
}[keyof StudentProfile]

/** Default empty profile for initialization */
export const EMPTY_PROFILE: StudentProfile = {
  fullName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  collegeEmail: "",
  phone: "",
  dob: "",
  rollNumber: "",
  course: "",
  branch: "",
  graduationYear: "",
  cgpa: "",
  tenthPercentage: "",
  tenthPassingYear: "",
  twelfthPercentage: "",
  twelfthPassingYear: "",
  activeBacklog: false,
  backlogCount: "",
  resumeLink: ""
}
