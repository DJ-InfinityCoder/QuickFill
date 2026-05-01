/**
 * Browser API utility for cross-browser compatibility.
 * Especially useful for Firefox MV2 where some chrome.* APIs are callback-based.
 */

/**
 * Safely send a message to a tab, returning a promise.
 * Handles the case where chrome.tabs.sendMessage might not return a promise (Firefox MV2).
 */
export function sendTabMessage(tabId: number, message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore - some environments might not have the callback-less version
      const result = chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(response)
        }
      })

      // In Chrome MV3, result is a Promise and the callback is still called.
      // In Firefox MV2, result is undefined.
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Safely set badge text, handling the fact that chrome.action might be chrome.browserAction.
 */
export function setBadgeText(text: string, tabId?: number): void {
  try {
    const action = chrome.action || (chrome as any).browserAction
    if (action && action.setBadgeText) {
      action.setBadgeText({ text, tabId })
    }
  } catch (err) {
    console.error("Failed to set badge text:", err)
  }
}

/**
 * Safely set badge background color.
 */
export function setBadgeBackgroundColor(color: string, tabId?: number): void {
  try {
    const action = chrome.action || (chrome as any).browserAction
    if (action && action.setBadgeBackgroundColor) {
      action.setBadgeBackgroundColor({ color, tabId })
    }
  } catch (err) {
    console.error("Failed to set badge background color:", err)
  }
}
