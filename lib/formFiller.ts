import type { DetectedField, FillSession, SerializableDetectedField } from "~types"

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function fillTextInput(el: HTMLElement, value: string): Promise<boolean> {
  try {
    const input = el as HTMLInputElement
    input.focus()
    await delay(50)
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    if (setter) setter.call(input, value)
    else input.value = value
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))
    input.dispatchEvent(new Event("blur", { bubbles: true }))
    await delay(100)
    return true
  } catch (e) {
    console.error("[QuickFill] fillTextInput error:", e)
    return false
  }
}

async function fillTextarea(el: HTMLElement, value: string): Promise<boolean> {
  try {
    const ta = el as HTMLTextAreaElement
    ta.focus()
    await delay(50)
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
    if (setter) setter.call(ta, value)
    else ta.value = value
    ta.dispatchEvent(new Event("input", { bubbles: true }))
    ta.dispatchEvent(new Event("change", { bubbles: true }))
    await delay(100)
    return true
  } catch (e) {
    console.error("[QuickFill] fillTextarea error:", e)
    return false
  }
}

async function fillDropdown(el: HTMLElement, value: string): Promise<boolean> {
  try {
    el.click()
    await delay(300)
    const selectors = ['div[role="option"]', 'div[data-value]']
    for (const sel of selectors) {
      try {
        const opts = document.querySelectorAll(sel)
        for (const opt of opts) {
          const txt = opt.textContent?.trim().toLowerCase() ?? ""
          if (txt === value.toLowerCase().trim() || txt.includes(value.toLowerCase().trim())) {
            ;(opt as HTMLElement).click()
            await delay(200)
            return true
          }
        }
      } catch { /* skip */ }
    }
    return false
  } catch (e) {
    console.error("[QuickFill] fillDropdown error:", e)
    return false
  }
}

async function fillRadio(el: HTMLElement, value: string): Promise<boolean> {
  try {
    const nv = value.toLowerCase().trim()
    const radios = el.querySelectorAll('div[role="radio"], label[role="radio"]')
    for (const r of radios) {
      const label = (r.getAttribute("aria-label") ?? r.textContent ?? "").toLowerCase().trim()
      if (label === nv || label.includes(nv) || nv.includes(label)) {
        const isChecked = r.getAttribute("aria-checked") === "true"
        // Only click if it's not already selected to avoid toggling/side-effects
        if (!isChecked) {
          ;(r as HTMLElement).click()
          await delay(200)
        }
        return true
      }
    }
    return false
  } catch (e) {
    console.error("[QuickFill] fillRadio error:", e)
    return false
  }
}

async function fillCheckbox(el: HTMLElement, value: string): Promise<boolean> {
  try {
    const nv = value.toLowerCase().trim()
    const shouldCheck = nv === "yes" || nv === "true"
    const cbs = el.querySelectorAll('div[role="checkbox"], label[role="checkbox"]')
    for (const cb of cbs) {
      const isChecked = cb.getAttribute("aria-checked") === "true"
      if (cbs.length === 1) {
        if (shouldCheck !== isChecked) (cb as HTMLElement).click()
        await delay(150)
        return true
      }
      const label = (cb.getAttribute("aria-label") ?? cb.textContent ?? "").toLowerCase().trim()
      if (label.includes(nv) || nv.includes(label)) {
        if (!isChecked) (cb as HTMLElement).click()
        await delay(150)
        return true
      }
    }
    return false
  } catch (e) {
    console.error("[QuickFill] fillCheckbox error:", e)
    return false
  }
}

async function fillDate(el: HTMLElement, value: string): Promise<boolean> {
  try {
    const parts = value.split("/")
    if (parts.length !== 3) return false
    const [day, month, year] = parts
    const inp = el as HTMLInputElement
    if (inp.type === "date") {
      const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      if (setter) setter.call(inp, formatted)
      else inp.value = formatted
      inp.dispatchEvent(new Event("input", { bubbles: true }))
      inp.dispatchEvent(new Event("change", { bubbles: true }))
      await delay(100)
      return true
    }
    return fillTextInput(el, value)
  } catch (e) {
    console.error("[QuickFill] fillDate error:", e)
    return false
  }
}

export async function fillField(field: DetectedField): Promise<boolean> {
  if (!field.mappedValue && field.mappedValue !== 0) return false
  const v = String(field.mappedValue)
  switch (field.fieldType) {
    case "text": case "email": case "number": case "url": return fillTextInput(field.element, v)
    case "textarea": return fillTextarea(field.element, v)
    case "dropdown": return fillDropdown(field.element, v)
    case "radio": return fillRadio(field.element, v)
    case "checkbox": return fillCheckbox(field.element, v)
    case "date": return fillDate(field.element, v)
    default: return false
  }
}

function serializeField(f: DetectedField): SerializableDetectedField {
  return {
    labelText: f.labelText, fieldType: f.fieldType, isRequired: f.isRequired,
    options: f.options, mappedProfileKey: f.mappedProfileKey,
    mappedValue: f.mappedValue, confidence: f.confidence, validationError: f.validationError
  }
}

export async function fillAllFields(
  fields: DetectedField[], formTitle: string,
  onProgress?: (current: number, total: number, label: string) => void
): Promise<FillSession> {
  let filledCount = 0, skippedCount = 0, errorCount = 0
  const fillable = fields.filter((f) => f.mappedValue !== undefined && f.mappedValue !== "")
  let cur = 0
  for (const field of fields) {
    if (field.mappedValue === undefined || field.mappedValue === "") { skippedCount++; continue }
    if (field.validationError) { errorCount++; continue }
    cur++
    onProgress?.(cur, fillable.length, field.labelText)
    try {
      if (await fillField(field)) filledCount++
      else errorCount++
    } catch { errorCount++ }
    await delay(150)
  }
  return {
    formTitle, detectedFields: fields.map(serializeField),
    filledCount, skippedCount, errorCount, timestamp: Date.now()
  }
}
