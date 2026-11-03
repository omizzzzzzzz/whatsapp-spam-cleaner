# WhatsApp Spam Cleaner — Chrome Extension

## Problem
WhatsApp has no "block all marketing" button. Indian users get bombarded with promotional messages from businesses (Paytm, Swiggy, Zomato, PhonePe, abCoffee, etc.) and the only way to block them is one-by-one, manually. It's tedious and most people just live with the spam.

## Solution
A Chrome extension that works on WhatsApp Web to:
1. **Scan** your chat list and detect business/promotional accounts
2. **Present** a clean checklist UI showing all detected promo accounts
3. **Let you select** which ones to block
4. **Automate the blocking** with human-like delays (30-60s between each) so your account stays safe

## How It Works (User Flow)
1. User installs the Chrome extension
2. Opens web.whatsapp.com
3. Clicks the extension icon → popup shows "Scan Chats"
4. Extension scans visible chats, identifies business accounts (green badge, "Business" label)
5. Popup displays: "Found 14 promotional accounts" with a checklist
6. User checks the ones they want to block
7. Hits "Clean Selected" button
8. Extension blocks them one by one:
   - Opens chat
   - Clicks three-dot menu
   - Clicks "Block"
   - Confirms block
   - Waits 30-60 seconds (randomized)
   - Moves to next
9. Shows progress: "Blocked 5/12 — currently blocking Paytm Travel..."
10. Done screen: "✅ 12 accounts blocked. Your WhatsApp is cleaner!"

## Technical Architecture

### Extension Structure
```
whatsapp-spam-cleaner/
├── manifest.json          # Chrome Extension Manifest V3
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Styles
│   └── popup.js           # Popup logic
├── content/
│   └── content.js         # Content script injected into WhatsApp Web
├── background/
│   └── background.js      # Service worker
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### Key Technical Details

**Detecting Business Accounts:**
- WhatsApp Web marks business accounts with a distinct badge/label
- Content script scans chat list DOM for business indicators
- Look for: `[data-icon="business"]`, business badge elements, "Business" text labels

**Safe Automation:**
- All actions happen via DOM interaction (clicking actual UI elements)
- Randomized delays: 30-60 seconds between each block action
- Maximum 5-10 blocks per session recommended
- User can pause/stop at any time
- Extension only acts when user explicitly triggers it

**Communication:**
- Popup ↔ Content Script via `chrome.runtime.sendMessage`
- Content script has access to WhatsApp Web DOM
- Background service worker handles state management

## Design
- Clean, minimal popup UI
- Dark theme to match WhatsApp Web aesthetic
- Green accent color (#25D366 — WhatsApp green)
- Progress bar during blocking
- Clear status messages

## Safety Features
- Rate limiting built in (30-60s random delays)
- Session limit (recommends max 10 blocks per session)
- Pause/Stop button always visible
- Warning message on first use about using responsibly
- No data leaves the browser — fully local/private

## MVP Scope (Build This First)
1. ✅ Scan WhatsApp Web chat list for business accounts
2. ✅ Display found accounts in popup with checkboxes
3. ✅ Block selected accounts one by one with delays
4. ✅ Show progress UI
5. ✅ Done/success screen

## Future Scope (Not MVP)
- Auto-detect new promotional messages
- Whitelist certain businesses
- Export block list
- Stats dashboard (blocked X accounts this month)
- Firefox support
