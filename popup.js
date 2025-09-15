// popup.js - Enhanced UI with automatic loading and status updates

let currentDomain = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    getCurrentDomain();
    runInitialCheck();
    
    // Add event listener for manual check button
    document.getElementById('checkBtn').addEventListener('click', handleManualCheck);
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

// Run initial check when popup opens
function runInitialCheck() {
    updateUI('loading', 'Checking for bug bounty programs...', '');
    
    chrome.runtime.sendMessage({ action: 'runLookup' }, (response) => {
        if (chrome.runtime.lastError) {
            updateUI('error', 'Error connecting to extension', 'Please try again');
            return;
        }
        
        handleLookupResponse(response);
    });
}

// Handle manual check button click
function handleManualCheck() {
    const button = document.getElementById('checkBtn');
    button.disabled = true;
    
    updateUI('loading', 'Checking for bug bounty programs...', '');
    hideResults();
    
    chrome.runtime.sendMessage({ action: 'runLookup' }, (response) => {
        button.disabled = false;
        
        if (chrome.runtime.lastError) {
            updateUI('error', 'Error connecting to extension', 'Please try again');
            return;
        }
        
        handleLookupResponse(response);
    });
}

// Handle lookup response from background script
function handleLookupResponse(response) {
    if (response.error) {
        updateUI('error', 'Error occurred', response.error);
        return;
    }

    if (response.data && response.data.found && response.data.programs && response.data.programs.length > 0) {
        // Programs found
        updateUI('success', 'Bug bounty programs found!', `Found ${response.data.programs.length} program(s) for ${currentDomain}`);
        displayResults(response.data.programs);
    } else {
        // No programs found
        updateUI('error', 'No bug bounty program found', `${currentDomain} doesn't appear to have a public bug bounty program`);
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
