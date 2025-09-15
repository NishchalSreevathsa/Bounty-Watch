// settings.js - Enhanced settings page with better UI and functionality

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadManualPrograms();
    
    // Event listeners
    document.getElementById('saveBtn').addEventListener('click', saveApiKeys);
    document.getElementById('addProgram').addEventListener('click', addManualProgram);
    
    // Enter key handling
    document.getElementById('domain').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addManualProgram();
    });
    document.getElementById('url').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addManualProgram();
    });
});

// Load existing settings
function loadSettings() {
    chrome.storage.sync.get(['h1', 'bc'], (result) => {
        if (result.h1) {
            document.getElementById('h1key').value = result.h1;
        }
        if (result.bc) {
            document.getElementById('bcKey').value = result.bc;
        }
    });
}

// Save API keys
function saveApiKeys() {
    const h1Key = document.getElementById('h1key').value.trim();
    const bcKey = document.getElementById('bcKey').value.trim();
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    
    // Show loading state
    saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
            <path d="M9 12l2 2 4-4"></path>
        </svg>
        Saving...
    `;
    saveBtn.disabled = true;
    
    chrome.storage.sync.set({
        h1: h1Key,
        bc: bcKey
    }, () => {
        // Reset button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        // Show success message
        showMessage('saveMessage', 'API keys saved successfully!');
        
        // Send keys to background script if they exist
        if (h1Key || bcKey) {
            chrome.runtime.sendMessage({
                action: 'unlockKeys',
                keys: {
                    hackerone: h1Key || null,
                    bugcrowd: bcKey || null
                }
            });
        }
    });
}

// Add manual program
function addManualProgram() {
    const domainInput = document.getElementById('domain');
    const urlInput = document.getElementById('url');
    const domain = domainInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!domain || !url) {
        alert('Please enter both domain and URL');
        return;
    }
    
    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        alert('Please enter a valid URL');
        return;
    }
    
    // Clean domain (remove protocol if present)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    chrome.storage.sync.get(['manualPrograms'], (result) => {
        const programs = result.manualPrograms || [];
        
        // Check for duplicates
        const exists = programs.some(p => p.domain === cleanDomain && p.url === url);
        if (exists) {
            alert('This program already exists');
            return;
        }
        
        programs.push({
            domain: cleanDomain,
            url: url,
            dateAdded: new Date().toISOString()
        });
        
        chrome.storage.sync.set({ manualPrograms: programs }, () => {
            domainInput.value = '';
            urlInput.value = '';
            loadManualPrograms();
            showMessage('saveMessage', 'Manual program added successfully!');
        });
    });
}

// Load and display manual programs
function loadManualPrograms() {
    chrome.storage.sync.get(['manualPrograms'], (result) => {
        const programs = result.manualPrograms || [];
        const programList = document.getElementById('programList');
        
        if (programs.length === 0) {
            programList.innerHTML = '<li style="text-align: center; color: #666; padding: 20px;">No manual programs added yet</li>';
            return;
        }
        
        programList.innerHTML = programs
            .sort((a, b) => a.domain.localeCompare(b.domain))
            .map((program, index) => `
                <li class="program-item">
                    <div class="program-info">
                        <div class="program-domain">${escapeHtml(program.domain)}</div>
                        <a href="${escapeHtml(program.url)}" target="_blank" class="program-url">
                            ${escapeHtml(program.url)}
                        </a>
                    </div>
                    <button class="delete-btn" onclick="deleteProgram(${index})">
                        Delete
                    </button>
                </li>
            `).join('');
    });
}

// Delete manual program
function deleteProgram(index) {
    if (!confirm('Are you sure you want to delete this program?')) {
        return;
    }
    
    chrome.storage.sync.get(['manualPrograms'], (result) => {
        const programs = result.manualPrograms || [];
        programs.splice(index, 1);
        
        chrome.storage.sync.set({ manualPrograms: programs }, () => {
            loadManualPrograms();
            showMessage('saveMessage', 'Program deleted successfully!');
        });
    });
}

// Show success message
function showMessage(elementId, message) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
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
