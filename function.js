// Helper function to check if current time is within operating hours (before midnight)
function isOperatingHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour < 24 && hour >= 7; // Operating between 7 AM and 12 AM
}

// Store multiple gerai statuses
let geraiStatuses = {
    'gerai11': { isOpen: false, lastUpdated: null, lastUpdatedBy: null },
    'gerai12': { isOpen: false, lastUpdated: null, lastUpdatedBy: null },
    'gerai13': { isOpen: false, lastUpdated: null, lastUpdatedBy: null },
    'gerai14': { isOpen: false, lastUpdated: null, lastUpdatedBy: null },
    'gerai15': { isOpen: false, lastUpdated: null, lastUpdatedBy: null }
};

function getGeraiStatus() {
    // If outside operating hours, show all gerai as closed
    if (!isOperatingHours()) {
        let statusMessage = '⏰ *Outside Operating Hours*\nAll gerai are closed.\n\n';
        statusMessage += 'Operating Hours: 7:00 AM - 12:00 AM\n\n';
        
        for (const [gerai, status] of Object.entries(geraiStatuses)) {
            const geraiNumber = gerai.replace('gerai', 'Gerai ');
            statusMessage += `${geraiNumber}: 🔴 Closed\n`;
        }
        return statusMessage;
    }

    // Normal status display during operating hours
    let statusMessage = '📊 *Current Gerai Statuses*\n\n';
    
    for (const [gerai, status] of Object.entries(geraiStatuses)) {
        const geraiNumber = gerai.replace('gerai', 'Gerai ');
        const statusEmoji = status.isOpen ? '🟢' : '🔴';
        const statusText = status.isOpen ? 'Open' : 'Closed';
        const updateInfo = status.lastUpdated 
            ? `\nLast Updated: ${status.lastUpdated}`
            : '\nNo updates yet';
        const updatedBy = status.lastUpdatedBy 
            ? `\nUpdated by: ${status.lastUpdatedBy}`
            : '';
            
        statusMessage += `${geraiNumber}: ${statusEmoji} ${statusText}${updateInfo}${updatedBy}\n\n`;
    }
    
    return statusMessage;
}

function updateGeraiStatus(geraiId, username) {
    // Check if within operating hours
    if (!isOperatingHours()) {
        return '⛔ Updates are disabled outside operating hours (12 AM - 7 AM).\nAll gerai are closed during this time.';
    }

    if (!geraiStatuses[geraiId]) {
        return 'Invalid gerai selected';
    }
    
    geraiStatuses[geraiId].isOpen = !geraiStatuses[geraiId].isOpen;
    geraiStatuses[geraiId].lastUpdated = new Date().toLocaleString();
    geraiStatuses[geraiId].lastUpdatedBy = username;
    
    const geraiNumber = geraiId.replace('gerai', 'Gerai ');
    return `✅ ${geraiNumber} status updated to: ${geraiStatuses[geraiId].isOpen ? 'Open 🟢' : 'Closed 🔴'}`;
}

// Function to automatically close all gerai at midnight
function autoCloseAllGerai() {
    for (const gerai in geraiStatuses) {
        if (geraiStatuses[gerai].isOpen) {
            geraiStatuses[gerai].isOpen = false;
            geraiStatuses[gerai].lastUpdated = new Date().toLocaleString();
            geraiStatuses[gerai].lastUpdatedBy = 'System (Auto-close)';
        }
    }
}

module.exports = {
    getGeraiStatus,
    updateGeraiStatus,
    autoCloseAllGerai,
    isOperatingHours
};