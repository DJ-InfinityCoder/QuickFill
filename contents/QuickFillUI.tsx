import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetStyle } from "plasmo"
import React, { useState, useEffect, useCallback } from "react"
import { detectFormFields, getFormTitle } from "~lib/formDetector"
import { matchFieldToProfile } from "~lib/fieldMatcher"
import { fillAllFields } from "~lib/formFiller"
import { getProfile, saveSession } from "~store/profileStore"
import type { DetectedField, StudentProfile } from "~types"
import { CheckIcon, SearchIcon, ProfileIcon } from "~components/Icons"
import logo from "data-base64:~assets/quick_fill.png"
import brandIcon from "data-base64:~assets/icon.png"
import cssText from "data-text:~style.css"

export const config: PlasmoCSConfig = {
  matches: ["https://docs.google.com/forms/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const QuickFillUI = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [filling, setFilling] = useState(false)
  const [fields, setFields] = useState<any[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [formTitle, setFormTitle] = useState("")

  // Auto-detect form on load
  useEffect(() => {
    const init = async () => {
      const p = await getProfile()
      setProfile(p)
      const title = getFormTitle()
      setFormTitle(title)
      
      if (title) {
        // Automatically open the UI if a form is detected
        setIsOpen(true)
        handleAutoScan(p)
      }
    }
    init()
  }, [])

  const handleAutoScan = async (p: StudentProfile | null) => {
    if (!p) return
    const detected = detectFormFields()
    
    const matchedFields = detected.map((field) => {
      const match = matchFieldToProfile(field, p, detected)
      if (match) {
        return {
          ...field,
          mappedProfileKey: match.key,
          mappedValue: match.value,
          confidence: match.confidence
        }
      }
      return field
    })
    
    setFields(matchedFields)
    setScanning(false)
  }

  const handleFill = async () => {
    setFilling(true)
    try {
      const session = await fillAllFields(fields as any, formTitle, () => {})
      await saveSession(session)
      setIsOpen(false) // Close after filling
    } catch (err) {
      console.error("Fill failed", err)
    } finally {
      setFilling(false)
    }
  }

  if (!formTitle) return null

  return (
    <div className="fixed right-4 top-20 z-[9999] flex flex-col items-end gap-3 font-sans antialiased">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-11 items-center justify-center rounded bg-brand-600 shadow-md transition-all hover:scale-105 active:scale-95 dark:bg-brand-500"
      >
        <img src={brandIcon} alt="QF" className="h-full w-full object-contain rounded" />
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <div className="flex w-72 flex-col overflow-hidden rounded border-[0.5px] border-surface-200/60 bg-white shadow-lg animate-slide-up dark:border-surface-700/50 dark:bg-surface-800">
          {/* Header */}
          <div className="border-b-[0.5px] border-surface-100 bg-surface-50/50 p-3 dark:border-surface-700 dark:bg-surface-900/50">
            <div className="flex items-center gap-2">
              <img src={logo} alt="QuickFill" className="h-5 w-auto object-contain" />
              <h2 className="text-xs font-bold tracking-tight text-gray-900 dark:text-white">Ready</h2>
            </div>
            <p className="mt-1 text-[9px] font-medium text-gray-500 line-clamp-1">{formTitle}</p>
          </div>

          {/* Content */}
          <div className="max-h-[350px] overflow-y-auto p-4">
            {scanning ? (
              <div className="flex flex-col items-center justify-center py-8 text-brand-500">
                <SearchIcon className="h-6 w-6 animate-pulse-soft" />
                <span className="mt-2 text-[11px] font-semibold uppercase tracking-widest">Analyzing...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-900/30 dark:bg-brand-950/20">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-brand-600 dark:text-brand-400">
                    Detection Status
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                    <span className="text-brand-600 dark:text-brand-400">{fields.filter(f => f.mappedValue).length}</span> fields ready for autofill.
                  </p>
                </div>

                <div
                  onClick={handleFill}
                  className={`btn-primary w-full gap-2 py-2.5 text-xs ${filling ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                >
                  {filling ? (
                    <span className="animate-pulse">Filling fields...</span>
                  ) : (
                    <>
                      <CheckIcon className="h-3.5 w-3.5" />
                      Autofill Form
                    </>
                  )}
                </div>
                
                <div className="rounded bg-surface-50 p-2 dark:bg-surface-900/50">
                  <p className="text-center text-[9px] leading-relaxed text-gray-500 dark:text-gray-400">
                    Please <span className="font-bold text-brand-600/80">verify</span> all data manually before submitting the form.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuickFillUI
