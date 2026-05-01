// ============================================================
// QuickFill — Validator
// Validation rules for StudentProfile field values
// ============================================================

import type { StudentProfile } from "~types"

interface ValidationResult {
  valid: boolean
  error?: string
}

/** RFC 5322 simplified email regex */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/** Phone: 10 digits, optionally prefixed with +91 */
const PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/

/** URL starting with http/https */
const URL_REGEX = /^https?:\/\/.+/

/** DD/MM/YYYY date format */
const DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/**
 * Validate a single profile field value.
 */
export function validateField(
  key: keyof StudentProfile,
  value: string | number | boolean
): ValidationResult {
  switch (key) {
    case "cgpa": {
      const num = parseFloat(String(value))
      if (isNaN(num)) return { valid: false, error: "CGPA must be a number" }
      if (num < 0 || num > 10) return { valid: false, error: "CGPA must be between 0.0 and 10.0" }
      return { valid: true }
    }

    case "tenthPercentage":
    case "twelfthPercentage": {
      const num = parseFloat(String(value))
      if (isNaN(num)) return { valid: false, error: "Percentage must be a number" }
      if (num < 0 || num > 100) return { valid: false, error: "Percentage must be between 0 and 100" }
      return { valid: true }
    }

    case "graduationYear":
    case "tenthPassingYear":
    case "twelfthPassingYear": {
      const num = parseInt(String(value), 10)
      if (isNaN(num)) return { valid: false, error: "Year must be a number" }
      if (num < 2000 || num > 2035) return { valid: false, error: "Year must be between 2000 and 2035" }
      return { valid: true }
    }

    case "email":
    case "collegeEmail": {
      const str = String(value)
      if (!str) return { valid: false, error: "Email is required" }
      if (!EMAIL_REGEX.test(str)) return { valid: false, error: "Invalid email format" }
      return { valid: true }
    }

    case "phone": {
      const str = String(value).replace(/\s/g, "")
      if (!str) return { valid: false, error: "Phone number is required" }
      if (!PHONE_REGEX.test(str)) return { valid: false, error: "Invalid phone (10 digits, optional +91)" }
      return { valid: true }
    }

    case "resumeLink": {
      const str = String(value)
      if (!str) return { valid: true } // Optional field
      if (!URL_REGEX.test(str)) return { valid: false, error: "URL must start with http:// or https://" }
      return { valid: true }
    }

    case "dob": {
      const str = String(value)
      if (!str) return { valid: false, error: "Date of birth is required" }
      const match = DATE_REGEX.exec(str)
      if (!match) return { valid: false, error: "Date must be DD/MM/YYYY format" }
      const day = parseInt(match[1], 10)
      const month = parseInt(match[2], 10)
      const year = parseInt(match[3], 10)
      if (month < 1 || month > 12) return { valid: false, error: "Invalid month" }
      if (day < 1 || day > 31) return { valid: false, error: "Invalid day" }
      const birthDate = new Date(year, month - 1, day)
      const now = new Date()
      const age = (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 15 || age > 35) return { valid: false, error: "Age must be between 15 and 35" }
      return { valid: true }
    }

    case "rollNumber": {
      const str = String(value)
      if (!str || str.trim().length === 0) return { valid: false, error: "Roll number is required" }
      if (!/^[a-zA-Z0-9]+$/.test(str.trim())) return { valid: false, error: "Roll number must be alphanumeric" }
      return { valid: true }
    }

    case "backlogCount": {
      const num = parseInt(String(value), 10)
      if (isNaN(num)) return { valid: false, error: "Backlog count must be a number" }
      if (num < 0) return { valid: false, error: "Backlog count cannot be negative" }
      return { valid: true }
    }

    case "fullName":
    case "firstName":
    case "lastName": {
      const str = String(value)
      if (!str || str.trim().length === 0) return { valid: false, error: `${key} is required` }
      return { valid: true }
    }

    default:
      return { valid: true }
  }
}

/**
 * Validate an entire StudentProfile object.
 * Returns a map of field keys to validation errors.
 */
export function validateProfile(
  profile: Partial<StudentProfile>
): Record<string, string> {
  const errors: Record<string, string> = {}
  const entries = Object.entries(profile) as Array<[keyof StudentProfile, string | number | boolean]>
  for (const [key, value] of entries) {
    if (value === undefined || value === "") continue
    const result = validateField(key, value)
    if (!result.valid && result.error) {
      errors[key] = result.error
    }
  }
  return errors
}
