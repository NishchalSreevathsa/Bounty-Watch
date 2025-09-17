// background.js
// Service worker / background script for Bounty Watch
// Fixed version with proper error handling

'use strict';

// Cache for domain results to avoid repeated checks
let domainCache = new Map();

// Listen for tab updates to automatically check domains
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Add proper error handling and validation
  if (changeInfo.status === 'complete' && tab && tab.url && tab.active) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      if (domain && !isExtensionUrl(url.href)) {
        checkDomainAndUpdateBadge(domain, tabId).catch(error => {
          console.error('Error in tab update listener:', error);
        });
      } else {
        // Clear badge for extension pages safely
        clearBadge(tabId);
      }
    } catch (error) {
      console.error('Error processing tab update:', error);
      clearBadge(tabId);
    }
  }
});

// Listen for tab activation to update badge for new active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Add error handling for tab access
  chrome.tabs.get(activeInfo.tabId).then(tab => {
    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        if (domain && !isExtensionUrl(tab.url)) {
          checkDomainAndUpdateBadge(domain, activeInfo.tabId).catch(error => {
            console.error('Error in tab activation listener:', error);
          });
        } else {
          clearBadge(activeInfo.tabId);
        }
      } catch (error) {
        console.error('Error processing activated tab:', error);
        clearBadge(activeInfo.tabId);
      }
    }
  }).catch(error => {
    console.error('Error getting activated tab:', error);
    // Tab might have been closed, ignore the error
  });
});

// Listen for tab removal to clean up cache
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Clean up any tab-specific data if needed
  // No badge operations needed since tab is being removed
});

// Helper function to check if URL is an extension URL
function isExtensionUrl(url) {
  return url.startsWith('chrome://') || 
         url.startsWith('chrome-extension://') || 
         url.startsWith('moz-extension://') ||
         url.startsWith('edge://') ||
         url.startsWith('about:');
}

// Helper function to safely clear badge
function clearBadge(tabId) {
  try {
    chrome.action.setBadgeText({ text: '', tabId }).catch(() => {
      // Tab might be closed, ignore error
    });
  } catch (error) {
    // Ignore errors when clearing badge
  }
}

// Check domain and update badge with improved error handling
async function checkDomainAndUpdateBadge(domain, tabId) {
  try {
    // Verify tab still exists before proceeding
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      return; // Tab was closed
    }

    // Check cache first
    if (domainCache.has(domain)) {
      const cachedResult = domainCache.get(domain);
      await updateBadge(cachedResult.found, tabId);
      return;
    }

    // Perform lookup
    const result = await performLookup(domain);
    
    // Cache result for 10 minutes
    domainCache.set(domain, { found: result.found, timestamp: Date.now() });
    setTimeout(() => domainCache.delete(domain), 10 * 60 * 1000);
    
    // Update badge - Check if programs were actually found
    const hasPrograms = result.data && result.data.found && result.data.programs && result.data.programs.length > 0;
    await updateBadge(hasPrograms, tabId);
    
  } catch (error) {
    if (error.message && error.message.includes('No tab with id')) {
      // Tab was closed, this is normal - don't log as error
      return;
    }
    console.error('Error checking domain:', error);
    // Try to update badge to show error state, but don't fail if tab is gone
    try {
      await updateBadge(false, tabId);
    } catch (badgeError) {
      // Tab probably closed, ignore
    }
  }
}

// Update extension badge with better error handling
async function updateBadge(found, tabId) {
  try {
    // Verify tab exists before updating badge
    await chrome.tabs.get(tabId);
    
    if (found) {
      // Green checkmark for found programs
      await chrome.action.setBadgeText({ text: '✓', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
      await chrome.action.setTitle({ 
        title: 'Bounty Watch - Bug bounty program found!',
        tabId 
      });
    } else {
      // Red X for no programs found
      await chrome.action.setBadgeText({ text: '✗', tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId });
      await chrome.action.setTitle({ 
        title: 'Bounty Watch - No bug bounty program found',
        tabId 
      });
    }
  } catch (error) {
    if (error.message && error.message.includes('No tab with id')) {
      // Tab was closed, this is expected
      return;
    }
    console.error('Error updating badge:', error);
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

// Get active tab's domain with better error handling
async function getActiveTabDomain() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tabs || !tabs.length || !tabs[0].url) {
      throw new Error('No active tab or invalid URL');
    }
    
    const url = new URL(tabs[0].url);
    return url.hostname;
  } catch (error) {
    throw new Error('Unable to get active tab domain: ' + error.message);
  }
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

// Fetch security.txt with timeout
async function fetchSecurityTxt(domain) {
  const urls = [
    `https://${domain}/.well-known/security.txt`,
    `https://${domain}/security.txt`
  ];
  
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const resp = await fetch(url, { 
        method: 'GET', 
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (resp.ok) {
        return await resp.text();
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('Security.txt fetch timeout for:', url);
      }
      continue;
    }
  }
  return null;
}

// Fetch homepage HTML with timeout
async function fetchHtml(domain) {
  const urls = [`https://${domain}/`];
  
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const resp = await fetch(url, { 
        method: 'GET', 
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (resp.ok) {
        return await resp.text();
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('Homepage fetch timeout for:', url);
      }
      continue;
    }
  }
  return null;
}

// Parse security.txt for program links
function parseSecurityTxt(txt, domain) {
  const programs = [];
  try {
    txt.split(/\r?\n/).forEach(line => {
      const m = line.match(/(https?:\/\/[^"'\s]+)/i);
      if (m) programs.push(makeProgram('Security.txt', m[1], domain));
    });
  } catch (error) {
    console.error('Error parsing security.txt:', error);
  }
  return programs;
}

// Parse homepage for keywords/links
function parseHomepageForBounty(html, domain) {
  const programs = [];
  try {
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
  } catch (error) {
    console.error('Error parsing homepage:', error);
  }
  return programs;
}

// Probe known platforms with timeout
async function probeKnownPlatformPaths(domain) {
  const urls = [
    `https://hackerone.com/${domain}`,
    `https://bugcrowd.com/${domain}`,
    `https://yeswehack.com/programs/${domain}`,
    `https://intigriti.com/bug-bounty/${domain}`
  ];
  
  const results = [];
  const probePromises = urls.map(async (url) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const resp = await fetch(url, { 
        method: 'HEAD', 
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (resp.ok || resp.status === 301 || resp.status === 302) {
        return makeProgram('Platform', url, domain);
      }
    } catch (e) {
      // Ignore errors and timeouts
    }
    return null;
  });
  
  const probeResults = await Promise.allSettled(probePromises);
  probeResults.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value);
    }
  });
  
  return results;
}

// Load user-defined manual programs from chrome.storage
async function getManualPrograms(domain) {
  return new Promise(resolve => {
    chrome.storage.sync.get(['manualPrograms'], result => {
      try {
        const manual = result.manualPrograms || [];
        const matches = manual
          .filter(p => p && p.domain === domain)
          .map(p => makeProgram('Manual', p.url, domain));
        resolve(matches);
      } catch (error) {
        console.error('Error getting manual programs:', error);
        resolve([]);
      }
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
