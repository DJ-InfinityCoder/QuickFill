// ============================================================
// QuickFill — ProfileForm Component
// Edit student profile with grouped sections
// ============================================================

import React, { useState, useEffect, useCallback } from "react"
import type { StudentProfile } from "~types"
import { EMPTY_PROFILE } from "~types"
import { getProfile, saveProfile, getProfileUpdatedAt, getProfileDraft, saveProfileDraft, clearProfileDraft } from "~store/profileStore"
import { validateProfile } from "~lib/validator"
import logo from "data-base64:~assets/quick_fill.png"
import { ProfileIcon, AcademicIcon, DocumentIcon } from "~components/Icons"

type ProfileKey = keyof StudentProfile

interface SectionConfig {
  title: string
  icon: React.ReactNode
  fields: Array<{
    key: ProfileKey
    label: string
    type: "text" | "email" | "number" | "tel" | "url" | "select" | "toggle"
    placeholder?: string
    options?: string[]
  }>
}

const SECTIONS: SectionConfig[] = [
  {
    title: "Personal Info",
    icon: <ProfileIcon className="w-5 h-5 text-brand-500" />,
    fields: [
      { key: "firstName", label: "First Name", type: "text", placeholder: "Dilip" },
      { key: "middleName", label: "Middle Name", type: "text", placeholder: "(optional)" },
      { key: "lastName", label: "Last Name", type: "text", placeholder: "Meghwal" },
      { key: "email", label: "Personal Email", type: "email", placeholder: "dilip@gmail.com" },
      { key: "collegeEmail", label: "College Email", type: "email", placeholder: "231210040@nitdelhi.ac.in" },
      { key: "phone", label: "Phone", type: "tel", placeholder: "+91 98888XXXXX" },
      { key: "dob", label: "Date of Birth", type: "text", placeholder: "DD/MM/YYYY" }
    ]
  },
  {
    title: "Academic Info",
    icon: <AcademicIcon className="w-5 h-5 text-brand-500" />,
    fields: [
      { key: "rollNumber", label: "Roll Number", type: "text", placeholder: "231210040" },
      { key: "course", label: "Course", type: "select", options: ["B.Tech", "M.Tech", "PhD"] },
      { key: "branch", label: "Branch / Department", type: "text", placeholder: "Computer Science and Engineering" },
      { key: "graduationYear", label: "Graduation Year", type: "number", placeholder: "2027" },
      { key: "cgpa", label: "CGPA", type: "number", placeholder: "8.5" },
      { key: "tenthPercentage", label: "10th Percentage", type: "number", placeholder: "90" },
      { key: "tenthPassingYear", label: "10th Passing Year", type: "number", placeholder: "2019" },
      { key: "twelfthPercentage", label: "12th Percentage", type: "number", placeholder: "85" },
      { key: "twelfthPassingYear", label: "12th Passing Year", type: "number", placeholder: "2021" },
      { key: "activeBacklog", label: "Active Backlogs?", type: "toggle" },
      { key: "backlogCount", label: "Backlog Count", type: "number", placeholder: "0" }
    ]
  },
  {
    title: "Documents",
    icon: <DocumentIcon className="w-5 h-5 text-brand-500" />,
    fields: [
      { key: "resumeLink", label: "Resume Link", type: "url", placeholder: "https://drive.google.com/..." }
    ]
  }
]

export function ProfileForm(): React.ReactElement {
  const [profile, setProfile] = useState<StudentProfile>(EMPTY_PROFILE)
  const [initialProfile, setInitialProfile] = useState<StudentProfile>(EMPTY_PROFILE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<number>(0)

  // Load profile / draft on mount
  useEffect(() => {
    async function loadInitialData() {
      // 1. Load official saved profile first to have a baseline
      const saved = await getProfile()
      if (saved) {
        setInitialProfile(saved)
      }

      // 2. Try to load draft
      const draft = await getProfileDraft()
      if (draft) {
        setProfile(draft)
      } else if (saved) {
        setProfile(saved)
      }

      // 3. Load last saved timestamp
      const ts = await getProfileUpdatedAt()
      if (ts) setLastSaved(new Date(ts).toLocaleString())
    }

    loadInitialData().catch(() => {})
  }, [])

  // Auto-save draft only if profile differs from initial saved profile
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasChanged = JSON.stringify(profile) !== JSON.stringify(initialProfile)
      
      if (hasChanged && profile !== EMPTY_PROFILE) {
        saveProfileDraft(profile).catch(() => {})
      } else {
        // If it matches initial, clear the draft to keep storage clean
        clearProfileDraft().catch(() => {})
      }
    }, 3000) // 3 seconds debounce

    return () => clearTimeout(timer)
  }, [profile, initialProfile])

  const updateField = useCallback((key: ProfileKey, value: string | number | boolean) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSaved(false)
  }, [])

  const handleSave = useCallback(async () => {
    // Auto-compute fullName from parts
    const computedFullName = [
      profile.firstName.trim(),
      profile.middleName.trim(),
      profile.lastName.trim()
    ].filter(Boolean).join(" ")
    const profileToSave = { ...profile, fullName: computedFullName }

    // Validate
    const validationErrors = validateProfile(profileToSave)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      await saveProfile(profileToSave)
      await clearProfileDraft()
      setProfile(profileToSave)
      setInitialProfile(profileToSave) // Update baseline
      setSaved(true)
      setLastSaved(new Date().toLocaleString())
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("[QuickFill] Save error:", err)
      setErrors({ _save: "Failed to save profile" })
    } finally {
      setSaving(false)
    }
  }, [profile])

  // Compute live preview of full name
  const fullNamePreview = [
    profile.firstName.trim(),
    profile.middleName.trim(),
    profile.lastName.trim()
  ].filter(Boolean).join(" ")

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Full name preview */}
      {fullNamePreview && (
        <div className="card border-brand-100 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/30">
          <p className="text-[10px] font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wider">Auto-generated Full Name</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{fullNamePreview}</p>
        </div>
      )}

      {/* Section accordion */}
      {SECTIONS.map((section, sIdx) => (
        <div key={section.title} className="card overflow-hidden">
          {/* Section header */}
          <div
            className="flex cursor-pointer items-center justify-between -m-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors"
            onClick={() => setExpandedSection(expandedSection === sIdx ? -1 : sIdx)}
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center">{section.icon}</span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {section.title}
              </h3>
            </div>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                expandedSection === sIdx ? "rotate-180" : ""
              }`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Section body */}
          {expandedSection === sIdx && (
            <div className="mt-4 space-y-3 animate-slide-up">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    {field.label}
                  </label>

                  {field.type === "toggle" ? (
                    <div
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => updateField(field.key, !profile[field.key])}
                    >
                      <div className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                        profile[field.key] ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
                      }`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                          profile[field.key] ? "translate-x-4" : "translate-x-0.5"
                        }`} />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {profile[field.key] ? "Yes" : "No"}
                      </span>
                    </div>
                  ) : field.type === "select" ? (
                    <select
                      className="input-field"
                      value={String(profile[field.key] ?? "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input-field"
                      type={field.type === "number" ? "text" : field.type}
                      value={String(profile[field.key] ?? "")}
                      placeholder={field.placeholder}
                      onChange={(e) => {
                        const val = e.target.value
                        if (field.type === "number") {
                          // Allow digits and a single decimal point
                          if (val !== "" && !/^\d*\.?\d*$/.test(val)) return
                        }
                        updateField(field.key, val)
                      }}
                    />
                  )}

                  {errors[field.key] && (
                    <p className="mt-0.5 text-[11px] text-red-500">{errors[field.key]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center justify-between cursor-pointer">
        <div
          className={`btn-primary w-full ${saving ? "animate-pulse-soft" : ""}`}
          onClick={handleSave}
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}
        </div>
      </div>

      {lastSaved && (
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
          Last saved: {lastSaved}
        </p>
      )}

      {errors._save && (
        <p className="text-center text-xs text-red-500">{errors._save}</p>
      )}

      {/* Brand logo at bottom */}
      <div className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-surface-100 pt-4 dark:border-surface-800">
        <img src={logo} alt="QuickFill" className="h-10 w-auto object-contain" />
        <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-brand-500/50">Developed by Dilip</p>
      </div>
    </div>
  )
}
