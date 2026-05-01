// ============================================================
// QuickFill — StatusBadge Component
// Shows confidence level and fill status indicators
// ============================================================

import React from "react"

interface StatusBadgeProps {
  confidence: number
  label?: string
}

export function ConfidenceBadge({ confidence, label }: StatusBadgeProps): React.ReactElement {
  let colorClass: string
  let text: string

  if (confidence >= 0.8) {
    colorClass = "badge-green"
    text = label ?? "High"
  } else if (confidence >= 0.5) {
    colorClass = "badge-yellow"
    text = label ?? "Medium"
  } else {
    colorClass = "badge-red"
    text = label ?? "Low"
  }

  return (
    <span className={colorClass}>
      {Math.round(confidence * 100)}% {text}
    </span>
  )
}

interface FillStatusProps {
  filled: number
  skipped: number
  errors: number
}

export function FillStatusSummary({ filled, skipped, errors }: FillStatusProps): React.ReactElement {
  const total = filled + skipped + errors
  return (
    <div className="flex items-center gap-3 text-xs animate-fade-in">
      <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-gray-600 dark:text-gray-400">{filled}/{total} filled</span>
      </div>
      {skipped > 0 && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-gray-600 dark:text-gray-400">{skipped} skipped</span>
        </div>
      )}
      {errors > 0 && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">{errors} errors</span>
        </div>
      )}
    </div>
  )
}

interface ProgressBarProps {
  current: number
  total: number
  label: string
}

export function ProgressBar({ current, total, label }: ProgressBarProps): React.ReactElement {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="animate-fade-in space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate max-w-[200px]">Filling: {label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
