// background.js
// Service worker / background script for Bounty Watch
// Simplified version without API complexity

'use strict';

// Cache for domain results to avoid repeated checks
let domainCache = new Map();

// Listen for tab updates to automatically check domains
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.active) {
    try {
      const domain = new URL(tab.url).hostname;
      if (domain && !domain.startsWith('chrome://') && !domain.startsWith('moz-extension://') && !domain.startsWith('chrome-extension://')) {
        checkDomainAndUpdateBadge(domain, tabId);
      } else {
        // Clear badge for extension pages
        chrome.action.setBadgeText({ text: '', tabId });
      }
    } catch (error) {
      // Invalid URL, clear badge
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// Listen for tab activation to update badge for new active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      try {
        const domain = new URL(tab.url).hostname;
        if (domain && !domain.startsWith('chrome://') && !domain.startsWith('moz-extension://') && !domain.startsWith('chrome-extension://')) {
          checkDomainAndUpdateBadge(domain, activeInfo.tabId);
        } else {
          chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
        }
      } catch (error) {
        chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
      }
    }
  });
});

// Check domain and update badge
async function checkDomainAndUpdateBadge(domain, tabId) {
  try {
    // Check cache first
    if (domainCache.has(domain)) {
      const cachedResult = domainCache.get(domain);
      updateBadge(cachedResult.found, tabId);
      return;
    }

    // Perform lookup
    const result = await performLookup(domain);
    
    // Cache result for 10 minutes
    domainCache.set(domain, { found: result.found, timestamp: Date.now() });
    setTimeout(() => domainCache.delete(domain), 10 * 60 * 1000);
    
    // Update badge - Check if programs were actually found
    const hasPrograms = result.data && result.data.found && result.data.programs && result.data.programs.length > 0;
    updateBadge(hasPrograms, tabId);
    
  } catch (error) {
    console.error('Error checking domain:', error);
    // On error, show red X
    updateBadge(false, tabId);
  }
}

// Update extension badge
function updateBadge(found, tabId) {
  if (found) {
    // Green checkmark for found programs
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
    chrome.action.setTitle({ 
      title: 'Bounty Watch - Bug bounty program found!',
      tabId 
    });
  } else {
    // Red X for no programs found
    chrome.action.setBadgeText({ text: '✗', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId });
    chrome.action.setTitle({ 
      title: 'Bounty Watch - No bug bounty program found',
      tabId 
    });
  }
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Run lookup requested by popup
  if (msg && msg.action === 'runLookup') {
    runLookupForActiveTab()
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  return false;
});

// Orchestrate lookup for active tab's domain
async function runLookupForActiveTab() {
  try {
    const domain = await getActiveTabDomain();
    return await performLookup(domain);
  } catch (err) {
    return { error: err.message };
  }
}

// Perform the actual lookup logic
async function performLookup(domain) {
  try {
    // Run heuristics + manual programs
    const programs = await lookupBountyPrograms(domain);

    if (!programs || programs.length === 0) {
      return { 
        message: `No program found for ${domain}`, 
        data: { found: false },
        found: false
      };
    }

    return {
      message: `Programs found for ${domain}`,
      data: { found: true, programs },
      found: true
    };

  } catch (err) {
    throw new Error(`Lookup failed: ${err.message}`);
  }
}

// Get active tab's domain
async function getActiveTabDomain() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tabs || !tabs.length) throw new Error('No active tab');
  return new URL(tabs[0].url).hostname;
}

// Run heuristics to detect bounty programs
async function lookupBountyPrograms(domain) {
  const results = [];

  try {
    // 1. Check security.txt
    const secTxt = await fetchSecurityTxt(domain);
    if (secTxt) results.push(...parseSecurityTxt(secTxt, domain));

    // 2. Parse homepage
    const homepageHtml = await fetchHtml(domain);
    if (homepageHtml) results.push(...parseHomepageForBounty(homepageHtml, domain));

    // 3. Probe known bounty platforms
    const platformDirect = await probeKnownPlatformPaths(domain);
    results.push(...platformDirect);

    // 4. Include user-defined manual programs from storage
    const manualPrograms = await getManualPrograms(domain);
    results.push(...manualPrograms);
  } catch (error) {
    console.error('Error in lookupBountyPrograms:', error);
  }

  return dedupePrograms(results);
}

// Fetch security.txt
async function fetchSecurityTxt(domain) {
  const urls = [
    `https://${domain}/.well-known/security.txt`,
    `https://${domain}/security.txt`
  ];
  for (const u of urls) {
    try {
      const resp = await fetch(u, { method: 'GET', mode: 'cors' });
      if (resp.ok) return await resp.text();
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Fetch homepage HTML
async function fetchHtml(domain) {
  for (const u of [`https://${domain}/`, `http://${domain}/`]) {
    try {
      const resp = await fetch(u, { method: 'GET', mode: 'cors' });
      if (resp.ok) return await resp.text();
    } catch (e) {
      continue;
    }
  }
  return null;
}

// Parse security.txt for program links
function parseSecurityTxt(txt, domain) {
  const programs = [];
  txt.split(/\r?\n/).forEach(line => {
    const m = line.match(/(https?:\/\/[^"]+)/i);
    if (m) programs.push(makeProgram('Security.txt', m[1], domain));
  });
  return programs;
}

// Parse homepage for keywords/links
function parseHomepageForBounty(html, domain) {
  const programs = [];
  const hrefRegex = /href=["']([^"']+)["']/ig;
  let m;
  while ((m = hrefRegex.exec(html)) !== null) {
    let link = m[1];
    if (link.startsWith('/')) link = `https://${domain}${link}`;
    if (/hackerone|bugcrowd|intigriti|yeswehack/i.test(link)) {
      programs.push(makeProgram('Platform', link, domain));
    }
  }
  // Check body text for bounty/disclosure keywords
  if (/bug bounty|responsible disclosure|vulnerability/i.test(html)) {
    programs.push(makeProgram('Website', `https://${domain}`, domain));
  }
  return programs;
}

// Probe known platforms
async function probeKnownPlatformPaths(domain) {
  const urls = [
    `https://hackerone.com/${domain}`,
    `https://bugcrowd.com/${domain}`,
    `https://yeswehack.com/programs/${domain}`,
    `https://intigriti.com/bug-bounty/${domain}`
  ];
  const results = [];
  for (const u of urls) {
    try {
      const resp = await fetch(u, { method: 'HEAD', mode: 'cors' });
      if (resp.ok || resp.status === 301 || resp.status === 302) {
        results.push(makeProgram('Platform', u, domain));
      }
    } catch (e) {
      continue;
    }
  }
  return results;
}

// Load user-defined manual programs from chrome.storage (keeping for future use)
async function getManualPrograms(domain) {
  return new Promise(resolve => {
    chrome.storage.sync.get(['manualPrograms'], result => {
      const manual = result.manualPrograms || [];
      const matches = manual
        .filter(p => p.domain === domain)
        .map(p => makeProgram('Manual', p.url, domain));
      resolve(matches);
    });
  });
}

// Construct program object
function makeProgram(source, link, domain) {
  return {
    platform: source,
    link,
    scope: domain,
    description: '',
    rewards: ''
  };
}

// Deduplicate by link
function dedupePrograms(list) {
  const map = new Map();
  for (const p of list) {
    try {
      const key = (new URL(p.link)).href.replace(/\/$/, '');
      if (!map.has(key)) map.set(key, p);
    } catch (e) {
      if (!map.has(p.link)) map.set(p.link, p);
    }
  }
  return Array.from(map.values());
}
