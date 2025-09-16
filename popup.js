// popup.js - Simplified version with auto-check only

let currentDomain = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    getCurrentDomain();
    runAutoCheck();
});

// Get current domain and display it
async function getCurrentDomain() {
    try {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tabs && tabs.length > 0) {
            currentDomain = new URL(tabs[0].url).hostname;
            document.getElementById('domain-info').textContent = `Current domain: ${currentDomain}`;
        }
    } catch (error) {
        console.error('Error getting domain:', error);
        document.getElementById('domain-info').textContent = 'Unable to detect current domain';
    }
}

// Run automatic check when popup opens
function runAutoCheck() {
    updateUI('loading', 'Checking for bug bounty programs...', '');
    
    chrome.runtime.sendMessage({ action: 'runLookup' }, (response) => {
        if (chrome.runtime.lastError) {
            updateUI('error', 'Error connecting to extension', 'Please try refreshing the page');
            showSuggestions();
            return;
        }
        
        handleLookupResponse(response);
    });
}

// Handle lookup response from background script
function handleLookupResponse(response) {
    if (response.error) {
        updateUI('error', 'Error occurred', response.error);
        showSuggestions();
        return;
    }

    if (response.data && response.data.found && response.data.programs && response.data.programs.length > 0) {
        // Programs found
        updateUI('success', 'Bug bounty programs found!', `Found ${response.data.programs.length} program(s) for ${currentDomain}`);
        displayResults(response.data.programs);
        hideSuggestions();
    } else {
        // No programs found
        updateUI('error', 'No bug bounty program found', `${currentDomain} doesn't appear to have a public bug bounty program`);
        hideResults();
        showSuggestions();
    }
}

// Update UI status
function updateUI(status, message, subtitle) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusMessage = document.getElementById('status');
    const domainInfo = document.getElementById('domain-info');
    
    // Remove all status classes
    statusIndicator.classList.remove('loading', 'success', 'error');
    statusIndicator.classList.add(status);
    
    // Clear previous content
    statusIndicator.innerHTML = '';
    
    // Add appropriate icon or spinner
    if (status === 'loading') {
        statusIndicator.innerHTML = '<div class="loading-spinner"></div>';
    } else if (status === 'success') {
        statusIndicator.innerHTML = `
            <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>
        `;
    } else if (status === 'error') {
        statusIndicator.innerHTML = `
            <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    }
    
    statusMessage.textContent = message;
    if (subtitle && !domainInfo.textContent.includes('Current domain:')) {
        domainInfo.textContent = subtitle;
    }
}

// Display results
function displayResults(programs) {
    const resultsSection = document.getElementById('results');
    const detailsDiv = document.getElementById('details');
    
    if (programs && programs.length > 0) {
        detailsDiv.innerHTML = programs.map(program => `
            <div class="program-item">
                <div class="program-platform">${escapeHtml(program.platform || 'Unknown')}</div>
                <a href="${escapeHtml(program.link)}" target="_blank" class="program-link">
                    ${escapeHtml(program.link)}
                </a>
            </div>
        `).join('');
        
        resultsSection.style.display = 'block';
    } else {
        hideResults();
    }
}

// Show suggestions when no programs found
function showSuggestions() {
    let suggestionsSection = document.getElementById('suggestions');
    
    if (!suggestionsSection) {
        // Create suggestions section
        suggestionsSection = document.createElement('div');
        suggestionsSection.id = 'suggestions';
        suggestionsSection.className = 'suggestions-section';
        suggestionsSection.innerHTML = `
            <div class="suggestions-header">
                <h3>Explore Bug Bounty Platforms</h3>
                <div class="suggestions-subtitle">Discover active programs on popular platforms</div>
            </div>
            <div class="suggestion-list">
                <a href="https://hackerone.com/programs" target="_blank" class="suggestion-item">
                    <div class="suggestion-icon">H1</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">HackerOne</div>
                        <div class="suggestion-desc">World's largest bug bounty platform</div>
                    </div>
                </a>
                <a href="https://bugcrowd.com/programs" target="_blank" class="suggestion-item">
                    <div class="suggestion-icon">BC</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">Bugcrowd</div>
                        <div class="suggestion-desc">Crowdsourced security platform</div>
                    </div>
                </a>
                <a href="https://intigriti.com/programs" target="_blank" class="suggestion-item">
                    <div class="suggestion-icon">IN</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">Intigriti</div>
                        <div class="suggestion-desc">European bug bounty platform</div>
                    </div>
                </a>
                <a href="https://yeswehack.com/programs" target="_blank" class="suggestion-item">
                    <div class="suggestion-icon">YW</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">YesWeHack</div>
                        <div class="suggestion-desc">Global ethical hacking platform</div>
                    </div>
                </a>
            </div>
        `;
        
        // Insert at the end of content
        const content = document.querySelector('.content');
        content.appendChild(suggestionsSection);
    }
    
    suggestionsSection.style.display = 'block';
}

// Hide suggestions
function hideSuggestions() {
    const suggestionsSection = document.getElementById('suggestions');
    if (suggestionsSection) {
        suggestionsSection.style.display = 'none';
    }
}

// Hide results section
function hideResults() {
    document.getElementById('results').style.display = 'none';
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
