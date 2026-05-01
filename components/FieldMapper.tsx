// ============================================================
// QuickFill — FieldMapper Component
// Shows detected fields with their mapped profile values
// ============================================================

import React from "react"
import type { SerializableDetectedField } from "~types"
import { ConfidenceBadge } from "./StatusBadge"
import { SearchIcon } from "./Icons"

interface FieldMapperProps {
  fields: SerializableDetectedField[]
  onValueChange?: (index: number, value: string) => void
}

/** Icon map for field types */
function getFieldTypeIcon(type: string): string {
  switch (type) {
    case "text": return "Aa"
    case "email": return "@"
    case "number": return "#"
    case "date": return "D"
    case "dropdown": return "v"
    case "radio": return "o"
    case "checkbox": return "x"
    case "url": return "w"
    case "textarea": return "T"
    default: return "?"
  }
}

export function FieldMapper({ fields, onValueChange }: FieldMapperProps): React.ReactElement {
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-gray-400">
          <SearchIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          No fields detected yet
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Click &quot;Scan Form&quot; to detect fields
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 animate-slide-up">
      {fields.map((field, idx) => (
        <div
          key={`${field.labelText}-${idx}`}
          className="card hover:shadow-md group"
        >
          {/* Header: label + type icon */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                {getFieldTypeIcon(field.fieldType)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {field.labelText}
                  {field.isRequired && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </p>
                {field.mappedProfileKey && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    → {field.mappedProfileKey}
                  </p>
                )}
              </div>
            </div>
            {field.confidence > 0 && (
              <ConfidenceBadge confidence={field.confidence} />
            )}
          </div>

          {/* Value input */}
          {field.mappedValue !== undefined && (
            <div className="mt-2">
              <input
                type="text"
                className="input-field text-xs"
                value={String(field.mappedValue)}
                onChange={(e) => onValueChange?.(idx, e.target.value)}
                placeholder="No value mapped"
              />
            </div>
          )}

          {/* Validation error */}
          {field.validationError && (
            <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">
              {field.validationError}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
