# 🧹 WhatsApp Spam Cleaner

A Chrome extension that scans your WhatsApp Web chats, detects business/promotional accounts, and lets you block them in bulk — safely, with human-like delays.

![Preview](https://raw.githubusercontent.com/omrane/whatsapp-spam-cleaner/main/assets/preview.png)

## The Problem

WhatsApp has no "block all marketing" button. Indian users get bombarded with promotional messages from businesses (Paytm, Swiggy, Zomato, PhonePe, etc.) and the only way to block them is one-by-one, manually.

## The Solution

This extension works on **WhatsApp Web** to:
1. **Scan** your chat list and detect business/promotional accounts
2. **Present** a clean checklist UI showing all detected promo accounts
3. **Let you select** which ones to block
4. **Automate the blocking** with 30-60s random delays between each block to keep your account safe

## Installation

1. Clone or download this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select this folder
5. Open [web.whatsapp.com](https://web.whatsapp.com)
6. Click the extension icon → **Scan My Chats**

## How It Works

1. Extension scans your visible WhatsApp Web chat list
2. Detects accounts with WhatsApp Business badges/labels
3. Shows you a checklist of all found promo accounts
4. You select which ones to block
5. Confirms with a safety warning
6. Blocks them one by one with **30-60 second random delays**
7. Shows progress with pause/stop controls

## Safety Features

- **Human-like delays**: 30-60 seconds (randomized) between each block
- **Session limit warning**: Recommends max 10 blocks per session
- **Pause/Stop**: Always available during blocking
- **User-initiated**: Nothing happens without your explicit action
- **Fully local**: No data leaves your browser — zero tracking, zero servers

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JS — no frameworks, no dependencies
- Content script for WhatsApp Web DOM interaction
- WhatsApp-themed dark UI

## Disclaimer

This extension interacts with WhatsApp Web's DOM. While it uses human-like delays to minimize risk, use it at your own discretion. WhatsApp may update their web interface at any time, which could require selector updates.

## License

MIT
