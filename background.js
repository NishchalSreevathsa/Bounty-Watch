// background.js
// Service worker / background script for Bounty Watch
// Handles lookup of bug bounty / vulnerability disclosure programs
// Secure, fully commented, and ready for Manifest V3

'use strict';

// In-memory cache for decrypted API keys for the current extension runtime.
// These are populated by the Settings page via the "unlockKeys" message and cleared via "lockKeys".
let apiKeys = {}; // e.g., { hackerone: 'TOKEN', bugcrowd: 'TOKEN' }

// Listen for messages from popup.js and settings.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Run lookup requested by popup
  if (msg && msg.action === 'runLookup') {
    runLookupForActiveTab()
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  // Settings page sent decrypted keys for the session — store them in-memory only
  if (msg && msg.action === 'unlockKeys') {
    apiKeys = msg.keys || {};
    sendResponse({ ok: true, message: 'API keys stored in memory for session.' });
    return true;
  }

  // Clear in-memory keys on explicit lock
  if (msg && msg.action === 'lockKeys') {
    apiKeys = {};
    sendResponse({ ok: true, message: 'API keys cleared from memory.' });
    return true;
  }

  return false;
});

// Orchestrate lookup for active tab's domain
async function runLookupForActiveTab() {
  try {
    const domain = await getActiveTabDomain(); // Get current domain

    // Try authoritative platform APIs first when keys are available (best-effort)
    const apiResults = [];
    if (apiKeys && apiKeys.hackerone) {
      const h = await tryHackerOneApi(domain);
      if (h) apiResults.push(h);
    }
    if (apiKeys && apiKeys.bugcrowd) {
      const b = await tryBugcrowdApi(domain);
      if (b) apiResults.push(b);
    }

    // If any API results found, return them (they are more authoritative)
    if (apiResults.length) {
      return { message: `Programs found for ${domain} (via platform APIs)`, data: { found: true, programs: apiResults } };
    }

    // Fallback: run heuristics + manual programs
    const programs = await lookupBountyPrograms(domain); // Run all other checks

    if (!programs || programs.length === 0) {
      // No results found
      return { message: `No program found for ${domain}`, data: { found: false } };
    }

    // Return results if found
    return {
      message: `Programs found for ${domain}`,
      data: { found: true, programs }
    };

  } catch (err) {
    return { error: err.message };
  }
}

// Get active tab's domain
async function getActiveTabDomain() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tabs || !tabs.length) throw new Error('No active tab');
  return new URL(tabs[0].url).hostname; // Extract hostname
}

// Run heuristics to detect bounty programs
async function lookupBountyPrograms(domain) {
  const results = [];

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

  return dedupePrograms(results);
}

// Try HackerOne API (best-effort). Note: endpoints and permissions vary — this attempts common endpoints.
// If the API or CORS blocks the request, this returns null. We avoid throwing to keep UX smooth.
async function tryHackerOneApi(domain) {
  try {
    // HackerOne's official API base is https://api.hackerone.com/ (see docs). We try a generic search endpoint.
    // NOTE: exact endpoint & parameters may require adjustments depending on your HackerOne account permissions.
    const endpoint = `https://api.hackerone.com/v1/organizations?search=${encodeURIComponent(domain)}`; // best-effort
    const resp = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKeys.hackerone}`
      },
      mode: 'cors'
    });
    if (!resp || !resp.ok) {
      // If 4xx/5xx or CORS blocked, just return null
      return null;
    }
    const json = await resp.json();
    // Parse result - keep it conservative: if we see organizations/programs, map them
    const programs = [];
    if (Array.isArray(json.data)) {
      for (const row of json.data.slice(0, 5)) {
        const link = row.relationships && row.relationships.programs && row.relationships.programs.links && row.relationships.programs.links.related ? row.relationships.programs.links.related : `https://hackerone.com/${row.attributes && row.attributes.handle ? row.attributes.handle : ''}`;
        programs.push({ platform: 'HackerOne', link, scope: domain, description: row.attributes && row.attributes.summary ? row.attributes.summary : '', rewards: '' });
      }
    }
    return programs.length ? programs[0] : null; // return primary program-like object
  } catch (e) {
    // Likely CORS or network error — ignore and return null
    return null;
  }
}

// Try Bugcrowd API (best-effort). Uses Bugcrowd REST API base; endpoint may need account-level permissions.
async function tryBugcrowdApi(domain) {
  try {
    // This is a best-effort attempt — Bugcrowd API base and query param names may vary by version.
    const endpoint = `https://api.bugcrowd.com/api/programs?query=${encodeURIComponent(domain)}`;
    const resp = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKeys.bugcrowd}`
      },
      mode: 'cors'
    });
    if (!resp || !resp.ok) return null;
    const json = await resp.json();
    // Parse response conservatively
    if (json && Array.isArray(json.data) && json.data.length) {
      const p = json.data[0];
      const link = p && p.attributes && p.attributes.url ? p.attributes.url : (`https://bugcrowd.com/${p && p.attributes && p.attributes.handle ? p.attributes.handle : ''}`);
      return { platform: 'Bugcrowd', link, scope: domain, description: p.attributes && p.attributes.description ? p.attributes.description : '', rewards: '' };
    }
    return null;
  } catch (e) {
    return null;
  }
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
      continue; // Ignore errors and try next
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
    if (link.startsWith('/')) link = `https://${domain}${link}`; // Relative → absolute
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
      continue; // Skip failures
    }
  }
  return results;
}

// Load user-defined manual programs from chrome.storage
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
    platform: source, // Source of info
    link, // Program link
    scope: domain, // Target domain
    description: '', // Reserved for enrichment
    rewards: '' // Reserved for enrichment
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

// End of background.js
