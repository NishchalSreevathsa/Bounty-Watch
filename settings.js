// settings.js - Enhanced settings page with better UI and functionality

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadManualPrograms();
    
    // Event listeners
    document.getElementById('saveBtn').addEventListener('click', saveApiKeys);
    document.getElementById('addProgram').addEventListener('click', addManualProgram);
    
    // Back button functionality
    document.getElementById('backBtn').addEventListener('click', (e) => {
        e.preventDefault();
        // Try to go back to popup, fallback to closing window
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });
    
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

// Save API keys with enhanced UI feedback
function saveApiKeys() {
    const h1Key = document.getElementById('h1key').value.trim();
    const bcKey = document.getElementById('bcKey').value.trim();
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    
    // Show loading state
    saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
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
        setTimeout(() => {
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
                }, (response) => {
                    if (response && response.ok) {
                        console.log('API keys sent to background script');
                    }
                });
            }
        }, 500); // Small delay to show the loading state
    });
}

// Add manual program with enhanced validation
function addManualProgram() {
    const domainInput = document.getElementById('domain');
    const urlInput = document.getElementById('url');
    const domain = domainInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!domain || !url) {
        showMessage('saveMessage', 'Please enter both domain and URL', 'error');
        return;
    }
    
    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        showMessage('saveMessage', 'Please enter a valid URL', 'error');
        return;
    }
    
    // Clean domain (remove protocol if present)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    chrome.storage.sync.get(['manualPrograms'], (result) => {
        const programs = result.manualPrograms || [];
        
        // Check for duplicates
        const exists = programs.some(p => p.domain === cleanDomain && p.url === url);
        if (exists) {
            showMessage('saveMessage', 'This program already exists', 'error');
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
            showMessage('saveMessage', 'Manual program added successfully!', 'success');
        });
    });
}

// Load and display manual programs
function loadManualPrograms() {
    chrome.storage.sync.get(['manualPrograms'], (result) => {
        const programs = result.manualPrograms || [];
        const programList = document.getElementById('programList');
        
        if (programs.length === 0) {
            programList.innerHTML = '<li style="text-align: center; color: #666; padding: 20px; font-style: italic;">No manual programs added yet</li>';
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
                        ${program.dateAdded ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">Added: ${new Date(program.dateAdded).toLocaleDateString()}</div>` : ''}
                    </div>
                    <button class="delete-btn" onclick="deleteProgram(${index})" title="Delete this program">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
                        </svg>
                    </button>
                </li>
            `).join('');
    });
}

// Delete manual program with confirmation
function deleteProgram(index) {
    if (!confirm('Are you sure you want to delete this program?')) {
        return;
    }
    
    chrome.storage.sync.get(['manualPrograms'], (result) => {
        const programs = result.manualPrograms || [];
        const deletedProgram = programs[index];
        programs.splice(index, 1);
        
        chrome.storage.sync.set({ manualPrograms: programs }, () => {
            loadManualPrograms();
            showMessage('saveMessage', `Program for ${deletedProgram.domain} deleted successfully!`, 'success');
        });
    });
}

// Enhanced show success/error message
function showMessage(elementId, message, type = 'success') {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Change color based on type
    if (type === 'error') {
        messageEl.style.background = '#EF4444';
    } else {
        messageEl.style.background = '#10B981';
    }
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 4000);
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
