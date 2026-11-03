// ── WhatsApp Spam Cleaner — Background Service Worker ──

// Listen for extension icon click — check if we're on WhatsApp Web
chrome.action.onClicked?.addListener((tab) => {
  if (!tab.url?.includes('web.whatsapp.com')) {
    // Not on WhatsApp Web — the popup handles this via the error screen
    console.log('Not on WhatsApp Web');
  }
});

// Optional: track stats
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    stats: {
      totalBlocked: 0,
      totalScans: 0,
      lastScan: null,
    }
  });
  console.log('WhatsApp Spam Cleaner installed');
});
