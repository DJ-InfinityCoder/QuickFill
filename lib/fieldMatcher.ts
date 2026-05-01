// ============================================================
// QuickFill — Field Matcher
// Maps detected form fields to StudentProfile keys using
// local keyword scoring (no external API calls)
// ============================================================

import type {
  DetectedField,
  StudentProfile
} from "~types"

// ============================================================
// Keyword map: profile key → list of keywords to match against
// ============================================================

const KEYWORD_MAP: Record<keyof StudentProfile, string[]> = {
  fullName: [
    "full name",
    "name",
    "your name",
    "student name",
    "candidate name",
    "applicant name"
  ],
  firstName: ["first name", "given name", "forename"],
  middleName: ["middle name"],
  lastName: ["last name", "surname", "family name"],
  email: [
    "email",
    "e-mail",
    "mail id",
    "personal email",
    "email address",
    "email id",
    "mail"
  ],
  collegeEmail: [
    "college email",
    "institute email",
    "university email",
    "official email",
    "academic email",
    "edu email"
  ],
  phone: [
    "phone",
    "contact",
    "mobile",
    "whatsapp",
    "phone number",
    "contact number",
    "mobile number",
    "cell",
    "telephone"
  ],
  dob: [
    "date of birth",
    "dob",
    "birth date",
    "birthday",
    "d.o.b",
    "born on"
  ],
  rollNumber: [
    "roll",
    "roll no",
    "roll number",
    "enrollment",
    "enrollment number",
    "registration",
    "registration number",
    "student id",
    "prn",
    "usn"
  ],
  course: [
    "course",
    "program",
    "degree",
    "programme",
    "qualification",
    "pursuing"
  ],
  branch: [
    "branch",
    "department",
    "stream",
    "specialization",
    "discipline",
    "major",
    "field of study"
  ],
  graduationYear: [
    "graduation year",
    "passing year",
    "year of passing",
    "batch",
    "expected year",
    "year of graduation",
    "passout year"
  ],
  cgpa: [
    "cgpa",
    "gpa",
    "cumulative grade",
    "grade point",
    "aggregate cgpa",
    "overall cgpa",
    "cpi",
    "graduation cgpa",
    "college cgpa",
    "degree cgpa",
    "university cgpa",
    "b.tech cgpa",
    "m.tech cgpa"
  ],
  tenthPercentage: [
    "10th",
    "tenth",
    "ssc",
    "matriculation",
    "class x",
    "class 10",
    "10th percentage",
    "10th marks",
    "ssc percentage",
    "10th %"
  ],
  tenthPassingYear: [
    "10th passing year",
    "10th year",
    "ssc year",
    "matriculation year"
  ],
  twelfthPercentage: [
    "12th",
    "twelfth",
    "hsc",
    "intermediate",
    "class xii",
    "class 12",
    "12th percentage",
    "12th marks",
    "hsc percentage",
    "12th %"
  ],
  twelfthPassingYear: [
    "12th passing year",
    "12th year",
    "hsc year",
    "intermediate year"
  ],
  activeBacklog: [
    "backlog",
    "arrear",
    "back paper",
    "active backlog",
    "any backlog",
    "do you have backlog",
    "live backlog"
  ],
  backlogCount: [
    "number of backlog",
    "no of backlog",
    "no. of backlog",
    "backlog count",
    "how many backlog",
    "total backlogs",
    "count of backlogs",
    "number of active backlog",
    "no of active backlog",
    "no. of active backlog"
  ],
  resumeLink: [
    "resume",
    "cv",
    "curriculum vitae",
    "portfolio",
    "resume link",
    "resume url",
    "cv link",
    "drive link"
  ]
}

// ============================================================
// Scoring utilities
// ============================================================

/** Compute Levenshtein distance between two strings */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/** Calculate similarity score between two strings (0 to 1) */
function stringSimilarity(a: string, b: string): number {
  const longer = a.length >= b.length ? a : b
  const shorter = a.length >= b.length ? b : a
  if (longer.length === 0) return 1.0
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

/** Score how well a label matches a keyword */
function scoreKeywordMatch(
  label: string,
  keyword: string
): number {
  const normalizedLabel = label.toLowerCase().trim()
  const normalizedKeyword = keyword.toLowerCase().trim()

  // Exact match
  if (normalizedLabel === normalizedKeyword) return 1.0

  // Label contains the keyword exactly
  if (normalizedLabel.includes(normalizedKeyword)) return 0.85

  // Keyword contains the label exactly (label is subset)
  if (normalizedKeyword.includes(normalizedLabel)) return 0.75

  // Word-level match: check if all words of keyword appear in label
  const keywordWords = normalizedKeyword.split(/\s+/)
  const labelWords = normalizedLabel.split(/\s+/)
  const allWordsFound = keywordWords.every((kw) =>
    labelWords.some(
      (lw) => lw.includes(kw) || kw.includes(lw)
    )
  )
  if (allWordsFound && keywordWords.length > 1) return 0.7

  // Single word partial match
  if (keywordWords.length === 1) {
    const bestWordMatch = Math.max(
      ...labelWords.map((lw) => stringSimilarity(lw, normalizedKeyword))
    )
    if (bestWordMatch >= 0.8) return 0.6
  }

  // Fuzzy match on full strings
  const similarity = stringSimilarity(normalizedLabel, normalizedKeyword)
  if (similarity >= 0.7) return 0.4

  return 0
}

// ============================================================
// Option matching for dropdown/radio fields
// ============================================================

/** Find the best matching option for a given value */
export function findBestOption(
  options: string[],
  value: string
): string | null {
  if (options.length === 0) return null

  const normalizedValue = value.toLowerCase().trim()

  // Exact match first
  const exactMatch = options.find(
    (opt) => opt.toLowerCase().trim() === normalizedValue
  )
  if (exactMatch) return exactMatch

  // Contains match
  const containsMatch = options.find(
    (opt) =>
      opt.toLowerCase().includes(normalizedValue) ||
      normalizedValue.includes(opt.toLowerCase())
  )
  if (containsMatch) return containsMatch

  // Fuzzy match: find option with highest similarity
  let bestMatch: string | null = null
  let bestScore = 0

  for (const option of options) {
    const score = stringSimilarity(
      option.toLowerCase().trim(),
      normalizedValue
    )
    if (score > bestScore && score >= 0.5) {
      bestScore = score
      bestMatch = option
    }
  }

  return bestMatch
}

// ============================================================
// Name combination helpers
// ============================================================

/**
 * Build a full name from individual parts.
 * Skips empty/whitespace-only parts, trims each part.
 * e.g. ("John", "", "Doe") → "John Doe"
 *      ("John", "Michael", "Doe") → "John Michael Doe"
 */
function buildFullName(first: string, middle: string, last: string): string {
  return [first.trim(), middle.trim(), last.trim()]
    .filter((part) => part.length > 0)
    .join(" ")
}

// ============================================================
// Main matching function
// ============================================================

interface MatchResult {
  key: keyof StudentProfile
  value: string
  confidence: number
}

/**
 * Match a detected form field to a StudentProfile key.
 * Returns null if no match found above the confidence threshold.
 */
export function matchFieldToProfile(
  field: DetectedField,
  profile: StudentProfile,
  allFields?: DetectedField[]
): MatchResult | null {
  const label = field.labelText

  let bestKey: keyof StudentProfile | null = null
  let bestScore = 0

  // Score each profile key against the field label
  const profileKeys = Object.keys(KEYWORD_MAP) as Array<keyof StudentProfile>
  for (const key of profileKeys) {

    const keywords = KEYWORD_MAP[key]
    let maxScore = 0

    for (const keyword of keywords) {
      const score = scoreKeywordMatch(label, keyword)
      if (score > maxScore) {
        maxScore = score
      }
    }

    if (maxScore > bestScore) {
      bestScore = maxScore
      bestKey = key
    }
  }

  // ── Tie-breaking and Specific Overrides ──
  // If we matched "backlog", check if it's asking for count or status
  if (bestKey === "activeBacklog" || bestKey === "backlogCount") {
    const lowerLabel = label.toLowerCase()
    const isCountRequested = /no\.? of|number of|count|how many/i.test(lowerLabel)
    if (isCountRequested) {
      bestKey = "backlogCount"
      bestScore = Math.max(bestScore, 0.9) // Boost confidence for explicit count
    } else if (field.fieldType === "radio" || field.fieldType === "dropdown") {
      // If it's a choice field, it's likely asking for status (Yes/No)
      bestKey = "activeBacklog"
      bestScore = Math.max(bestScore, 0.9)
    }
  }

  // ── Score Isolation ──
  // 1. If label contains "10th" or "X", prevent it from matching graduation "cgpa" or "12th"
  const is10thLabel = /10th|class x|ssc|matric/i.test(label)
  const is12thLabel = /12th|class xii|hsc|intermediate/i.test(label)

  if (is10thLabel && bestKey !== "tenthPercentage" && bestKey !== "tenthPassingYear") {
    // If it's a 10th field but we matched something else (like graduation cgpa), correct it
    if (label.toLowerCase().includes("percentage") || label.toLowerCase().includes("cgpa") || label.toLowerCase().includes("score") || label.toLowerCase().includes("marks")) {
      bestKey = "tenthPercentage"
      bestScore = 0.95
    }
  }

  if (is12thLabel && bestKey !== "twelfthPercentage" && bestKey !== "twelfthPassingYear") {
    // If it's a 12th field but we matched something else, correct it
    if (label.toLowerCase().includes("percentage") || label.toLowerCase().includes("cgpa") || label.toLowerCase().includes("score") || label.toLowerCase().includes("marks")) {
      bestKey = "twelfthPercentage"
      bestScore = 0.95
    }
  }

  // 2. If it's graduation CGPA, ensure it doesn't match if school levels are present
  if (bestKey === "cgpa" && (is10thLabel || is12thLabel)) {
    // This is a conflict - it's school cgpa, not graduation
    if (is10thLabel) bestKey = "tenthPercentage"
    else bestKey = "twelfthPercentage"
    bestScore = 0.95
  }
  // 3. Email Isolation
  const lowerLabel = label.toLowerCase()
  const isCollegeEmail = /college|institute|university|official|academic|edu/i.test(lowerLabel)
  
  if (bestKey === "email" || bestKey === "collegeEmail") {
    if (isCollegeEmail) {
      bestKey = "collegeEmail"
      bestScore = Math.max(bestScore, 0.95)
    } else {
      // Default to personal email for generic "Email" or non-college labels
      bestKey = "email"
      bestScore = Math.max(bestScore, 0.95)
    }
  }

  // Confidence threshold
  if (!bestKey || bestScore < 0.3) return null

  // ── Smart value resolution ──
  // For name fields: construct the right combination from parts
  let value: string

  if (bestKey === "fullName" || (label.toLowerCase().includes("name") && bestKey === "firstName")) {
    // Context-aware name handling
    const otherFields = allFields || []
    const hasSeparateLastName = otherFields.some(f => 
      f !== field && 
      (f.labelText.toLowerCase().includes("last name") || f.labelText.toLowerCase().includes("surname"))
    )
    const hasSeparateFirstName = otherFields.some(f => 
      f !== field && 
      (f.labelText.toLowerCase().includes("first name") || f.labelText.toLowerCase().includes("given name"))
    )

    if (hasSeparateLastName || hasSeparateFirstName) {
      // If there are separate fields, this "Name" field is likely just First Name (or First + Middle)
      value = buildFullName(profile.firstName, profile.middleName, "")
      bestKey = "firstName" // Re-map to firstName for clarity
    } else {
      // No other name fields found -> this is the only name field -> use Full Name
      value = buildFullName(profile.firstName, profile.middleName, profile.lastName)
      bestKey = "fullName"
    }
  } else {
    // Standard profile value lookup
    const rawValue = profile[bestKey]
    if (typeof rawValue === "boolean") {
      value = rawValue ? "Yes" : "No"
    } else {
      value = String(rawValue ?? "")
    }
  }

  // For dropdown/radio fields, find the best matching option
  if (
    (field.fieldType === "dropdown" || field.fieldType === "radio") &&
    field.options &&
    field.options.length > 0
  ) {
    const matchedOption = findBestOption(field.options, value)
    if (matchedOption) {
      value = matchedOption
    }
  }

  return {
    key: bestKey,
    value,
    confidence: bestScore
  }
}
