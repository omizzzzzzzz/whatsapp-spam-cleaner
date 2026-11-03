// ── WhatsApp Spam Cleaner — Content Script ──
// Injected into web.whatsapp.com
// Handles: scanning for business accounts, blocking them via DOM interaction

(() => {
  'use strict';

  // ── Utility: wait for element ──
  function waitFor(selector, parent = document, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = parent.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = parent.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(parent, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for: ${selector}`));
      }, timeout);
    });
  }

  // ── Utility: sleep ──
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Utility: simulate click ──
  function simulateClick(el) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  // ── Scan: Find business accounts in the chat list ──
  function scanForBusinessAccounts() {
    const accounts = [];

    // WhatsApp Web chat list — each chat row is in a div with role="listitem" or similar
    // Business accounts have specific indicators:
    // 1. A green verified badge icon (data-icon="verified-business" or similar)
    // 2. "Business" text in the chat info
    // 3. Business-specific span/icon elements

    const chatList = document.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]');

    chatList.forEach((chat, index) => {
      let isBusiness = false;
      let chatName = '';

      // Method 1: Check for business verification icons
      const businessIcons = chat.querySelectorAll(
        '[data-icon*="business"], [data-icon*="verified"], [data-testid*="business"]'
      );
      if (businessIcons.length > 0) {
        isBusiness = true;
      }

      // Method 2: Check for "Business" label text in the chat row
      const spans = chat.querySelectorAll('span');
      spans.forEach(span => {
        const text = span.textContent.trim();
        // Detect "Business account" label that WhatsApp shows
        if (text === 'Business' || text === 'Business account') {
          isBusiness = true;
        }
      });

      // Method 3: Check for the green business badge SVG
      const svgs = chat.querySelectorAll('svg');
      svgs.forEach(svg => {
        const title = svg.querySelector('title');
        if (title && title.textContent.toLowerCase().includes('business')) {
          isBusiness = true;
        }
      });

      // Method 4: Check aria-labels for business indicators
      const ariaEls = chat.querySelectorAll('[aria-label]');
      ariaEls.forEach(el => {
        const label = el.getAttribute('aria-label').toLowerCase();
        if (label.includes('business') || label.includes('verified business')) {
          isBusiness = true;
        }
      });

      // Get the chat name
      // WhatsApp typically puts the name in a span inside the title area
      const nameEl = chat.querySelector('[data-testid="cell-frame-title"] span[dir="auto"], span[title]');
      if (nameEl) {
        chatName = nameEl.textContent.trim() || nameEl.getAttribute('title') || '';
      }

      // Fallback: get from the first substantial span
      if (!chatName) {
        const titleSpans = chat.querySelectorAll('span[dir="auto"]');
        for (const sp of titleSpans) {
          const t = sp.textContent.trim();
          if (t && t.length > 1 && t.length < 50) {
            chatName = t;
            break;
          }
        }
      }

      if (isBusiness && chatName) {
        accounts.push({
          id: `biz-${index}`,
          name: chatName,
          element: null, // Can't pass DOM elements via message, we'll re-find them
          index: index,
        });
      }
    });

    // Deduplicate by name
    const seen = new Set();
    const unique = accounts.filter(a => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    });

    return unique;
  }

  // ── Block: Block a specific business account ──
  async function blockAccount(account) {
    try {
      // Step 1: Find and click the chat in the sidebar
      const chatList = document.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]');
      let targetChat = null;

      for (const chat of chatList) {
        const nameEl = chat.querySelector('[data-testid="cell-frame-title"] span[dir="auto"], span[title]');
        let name = '';
        if (nameEl) {
          name = nameEl.textContent.trim() || nameEl.getAttribute('title') || '';
        }
        if (!name) {
          const titleSpans = chat.querySelectorAll('span[dir="auto"]');
          for (const sp of titleSpans) {
            const t = sp.textContent.trim();
            if (t && t.length > 1 && t.length < 50) {
              name = t;
              break;
            }
          }
        }
        if (name === account.name) {
          targetChat = chat;
          break;
        }
      }

      if (!targetChat) {
        return { success: false, error: 'Chat not found in sidebar' };
      }

      // Click the chat to open it
      simulateClick(targetChat);
      await sleep(1500);

      // Step 2: Click the three-dot menu (or the contact header)
      // Try clicking the chat header to open contact info
      const header = document.querySelector('[data-testid="conversation-header"], header');
      if (!header) {
        return { success: false, error: 'Could not find chat header' };
      }

      // Click on the contact name/info area in the header
      const headerClickable = header.querySelector('[data-testid="conversation-info-header-chat-title"], [role="button"], span[dir="auto"]');
      if (headerClickable) {
        simulateClick(headerClickable);
        await sleep(1500);
      }

      // Step 3: Look for the three-dot menu button in the chat
      const menuBtn = document.querySelector(
        '[data-testid="menu"], [data-testid="btn-context-menu"], [aria-label="Menu"], [data-icon="menu"]'
      );

      if (menuBtn) {
        simulateClick(menuBtn);
        await sleep(800);

        // Step 4: Find and click "Block" in the dropdown menu
        const menuItems = document.querySelectorAll('[role="menuitem"], [data-testid*="mi-block"], li');
        let blockItem = null;

        for (const item of menuItems) {
          const text = item.textContent.toLowerCase();
          if (text.includes('block')) {
            blockItem = item;
            break;
          }
        }

        if (blockItem) {
          simulateClick(blockItem);
          await sleep(1000);

          // Step 5: Confirm the block in the dialog
          const confirmBtns = document.querySelectorAll('[data-testid="popup-controls-ok"], button');
          for (const btn of confirmBtns) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('block') && !text.includes('unblock')) {
              simulateClick(btn);
              await sleep(1000);
              return { success: true };
            }
          }
        }
      }

      // Alternative: Try the contact info panel approach
      // Look for "Block" button in the contact info panel
      const panelButtons = document.querySelectorAll('button, [role="button"]');
      for (const btn of panelButtons) {
        const text = btn.textContent.toLowerCase().trim();
        if (text === 'block' || text.includes('block ')) {
          simulateClick(btn);
          await sleep(1000);

          // Confirm
          const confirmBtns = document.querySelectorAll('button, [role="button"]');
          for (const cb of confirmBtns) {
            const ct = cb.textContent.toLowerCase();
            if (ct.includes('block') && !ct.includes('unblock') && cb !== btn) {
              simulateClick(cb);
              await sleep(1000);
              return { success: true };
            }
          }

          return { success: true };
        }
      }

      return { success: false, error: 'Could not find block option' };
    } catch (err) {
      console.error('WhatsApp Spam Cleaner — block error:', err);
      return { success: false, error: err.message };
    }
  }

  // ── Message Handler ──
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scan') {
      // Allow a small delay for DOM to be ready
      setTimeout(() => {
        const accounts = scanForBusinessAccounts();
        sendResponse({ accounts });
      }, 500);
      return true; // async response
    }

    if (message.action === 'block') {
      blockAccount(message.account).then(result => {
        sendResponse(result);
      });
      return true; // async response
    }

    if (message.action === 'ping') {
      sendResponse({ alive: true });
      return;
    }
  });

  console.log('✅ WhatsApp Spam Cleaner — content script loaded');
})();
