// ============================================================
// QuickFill — Background Service Worker
// Handles message routing and tab badge management
// ============================================================

import type { ExtensionMessage } from "~types"
import { saveSession } from "~store/profileStore"

/** Track which tabs have Google Forms open */
const formTabs = new Map<number, string>()

// ============================================================
// Tab update listener — badge the icon on Google Forms pages
// ============================================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    try {
      if (tab.url.includes("docs.google.com/forms")) {
        chrome.action.setBadgeText({ text: "●", tabId })
        chrome.action.setBadgeBackgroundColor({ color: "#6366f1", tabId })
      } else {
        chrome.action.setBadgeText({ text: "", tabId })
        formTabs.delete(tabId)
      }
    } catch {
      // Badge API may fail in some contexts
    }
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  formTabs.delete(tabId)
})

// ============================================================
// Message routing: popup ↔ content script
// ============================================================

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Messages from content script
    if (sender.tab?.id) {
      const tabId = sender.tab.id

      if (message.type === "FORM_DETECTED") {
        formTabs.set(tabId, message.title)
        chrome.action.setBadgeText({ text: "●", tabId }).catch(() => {})
        // Forward to popup if it's listening
        sendResponse({ received: true })
        return false
      }

      if (message.type === "FILL_COMPLETE") {
        // Save session and forward to popup
        saveSession(message.session).catch(() => {})
        sendResponse({ received: true })
        return false
      }
    }

    // Messages from popup that need to go to content script
    if (message.type === "TRIGGER_AUTOFILL" || message.type === "CONFIRM_FILL") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0]
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, message)
            .then((response) => sendResponse(response))
            .catch((err: unknown) => {
              const errorMsg = err instanceof Error ? err.message : "Failed to reach content script"
              sendResponse({ success: false, error: errorMsg })
            })
        } else {
          sendResponse({ success: false, error: "No active tab found" })
        }
      })
      return true // Async response
    }

    return false
  }
)

// ============================================================
// Extension install/update
// ============================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[QuickFill] Extension installed")
  } else if (details.reason === "update") {
    console.log("[QuickFill] Extension updated")
  }
})

export {}
