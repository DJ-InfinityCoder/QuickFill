// ============================================================
// QuickFill — Popup UI (Main Extension Popup)
// Tabbed interface: Autofill | Profile
// ============================================================

import React, { useState, useEffect, useCallback } from "react"
import "~style.css"
import type {
  ExtensionMessage,
  FillSession,
  SerializableDetectedField
} from "~types"
import { FieldMapper } from "~components/FieldMapper"
import { ProfileForm } from "~components/ProfileForm"
import { FillStatusSummary, ProgressBar } from "~components/StatusBadge"
import { getLastSession } from "~store/profileStore"
import { AutofillIcon, ProfileIcon, SearchIcon, CheckIcon } from "~components/Icons"

import logo from "data-base64:~assets/quick_fill.png"

type Tab = "autofill" | "profile"

interface ProgressState {
  current: number
  total: number
  label: string
}

function IndexPopup(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>("autofill")
  const [formTitle, setFormTitle] = useState<string | null>(null)
  const [fields, setFields] = useState<SerializableDetectedField[]>([])
  const [scanning, setScanning] = useState(false)
  const [filling, setFilling] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [session, setSession] = useState<FillSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Listen for messages from content script / background
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      switch (message.type) {
        case "FORM_DETECTED":
          setFormTitle(message.title)
          break
        case "FILL_PREVIEW":
          setFields(message.fields)
          setFormTitle(message.formTitle)
          setScanning(false)
          setShowConfirm(true)
          break
        case "FILL_PROGRESS":
          setProgress({
            current: message.current,
            total: message.total,
            label: message.fieldLabel
          })
          break
        case "FILL_COMPLETE":
          setSession(message.session)
          setFilling(false)
          setProgress(null)
          setShowConfirm(false)
          break
        case "FILL_ERROR":
          setError(message.error)
          setScanning(false)
          setFilling(false)
          break
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // Check for form on current tab
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.url?.includes("docs.google.com/forms")) {
        setFormTitle(tab.title ?? "Google Form")
      }
    })
    getLastSession().then((s) => {
      if (s) setSession(s)
    }).catch(() => {})
  }, [])

  // Auto-scan on tab switch or mount
  useEffect(() => {
    if (activeTab === "autofill" && formTitle && !scanning) {
      // Small delay to ensure any profile changes are saved/flushed
      const timer = setTimeout(() => {
        handleScan()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [activeTab, formTitle])

  const handleScan = useCallback(() => {
    setError(null)
    setScanning(true)
    setSession(null)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_AUTOFILL" }).catch(() => {
          setError("Could not reach the form page. Refresh and try again.")
          setScanning(false)
        })
      }
    })
  }, [])

  const handleFill = useCallback(() => {
    setError(null)
    setFilling(true)
    setShowConfirm(false)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CONFIRM_FILL" }).catch(() => {
          setError("Could not reach the form page. Refresh and try again.")
          setFilling(false)
        })
      }
    })
  }, [])

  const handleFieldValueChange = useCallback((idx: number, value: string) => {
    setFields((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], mappedValue: value }
      return updated
    })
  }, [])

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: "autofill", label: "Autofill", icon: <AutofillIcon className="w-4 h-4" /> },
    { key: "profile", label: "Profile", icon: <ProfileIcon className="w-4 h-4" /> }
  ]

  return (
    <div className="flex h-[560px] w-[380px] flex-col bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <div className="shrink-0 border-b border-surface-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-surface-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="QuickFill" className="h-9 w-auto object-contain" />
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">
                QuickFill
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Placement Form Autofiller
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-surface-200 bg-white dark:border-gray-700 dark:bg-surface-800">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all duration-200 ${
              activeTab === tab.key ? "tab-active" : "tab-inactive"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Autofill Tab */}
        {activeTab === "autofill" && (
          <div className="space-y-3">
            {/* Form detection status */}
            <div className="card">
              {formTitle ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-3 w-3 shrink-0 items-center justify-center rounded-sm bg-brand-500 animate-pulse-soft">
                      <div className="h-1 w-1 rounded-full bg-white" />
                    </div>
                    <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400">
                      Form Detected
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                    {formTitle}
                  </p>

                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    No Google Form detected — navigate to a form page
                  </span>
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="card border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 animate-fade-in">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Progress bar during filling */}
            {filling && progress && (
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label={progress.label}
              />
            )}

            {/* Session result */}
            {session && !filling && (
              <div className="card border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 animate-fade-in">
                <p className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  ✓ Fill Complete
                </p>
                <FillStatusSummary
                  filled={session.filledCount}
                  skipped={session.skippedCount}
                  errors={session.errorCount}
                />
                
                <div className="mt-4 border-t border-emerald-200 pt-3 dark:border-emerald-800">
                  <div className="flex gap-2 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                    <span className="shrink-0 font-bold">⚠️ IMPORTANT:</span>
                    <span>Please manually verify all fields on the Google Form before clicking the final "Submit" button. Human verification is essential to ensure 100% accuracy.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons (Now at the top) */}
            {showConfirm && !filling && (
              <div className="flex gap-2 animate-fade-in mb-3">
                <div className="btn-primary flex-1 gap-2 cursor-pointer" onClick={handleFill}>
                  <CheckIcon className="w-4 h-4" />
                  Fill {fields.filter((f) => f.mappedValue).length} Fields
                </div>
                <div className="btn-secondary cursor-pointer" onClick={() => { setShowConfirm(false); setFields([]) }}>
                  Cancel
                </div>
              </div>
            )}

            {/* Field list */}
            {fields.length > 0 && (
              <FieldMapper
                fields={fields}
                onValueChange={handleFieldValueChange}
              />
            )}

            {/* Auto-scanning indicator */}
            {scanning && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-brand-500 animate-pulse-soft">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Auto-scanning form...
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && <ProfileForm />}

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-surface-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-surface-800">
        <p className="text-center text-[9px] text-gray-400 dark:text-gray-600">
          QuickFill v0.1.0 · All data stored locally
        </p>
      </div>
    </div>
  )
}

export default IndexPopup
