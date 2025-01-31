const { GERAI_LIST, OPERATING_HOURS } = require('./config');

// Helper function to check if current time is within operating hours
function isOperatingHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour < OPERATING_HOURS.end && hour >= OPERATING_HOURS.start;
}

// Create gerai statuses dynamically from config
let geraiStatuses = {};
GERAI_LIST.forEach(gerai => {
    geraiStatuses[gerai.id] = { 
        isOpen: false, 
        lastUpdated: null,
        lastUpdatedBy: null 
    };
});

function getGeraiStatus() {
    // If outside operating hours, show all gerai as closed
    if (!isOperatingHours()) {
        let statusMessage = '⏰ *Outside Operating Hours*\nAll gerai are closed.\n\n';
        statusMessage += `Operating Hours: ${OPERATING_HOURS.start}:00 AM - ${OPERATING_HOURS.end}:00 PM\n\n`;
        
        GERAI_LIST.forEach(gerai => {
            statusMessage += `${gerai.name}: 🔴 Closed\n`;
        });
        return statusMessage;
    }

    // Normal status display during operating hours
    let statusMessage = '📊 *Current Gerai Statuses*\n\n';
    
    GERAI_LIST.forEach(gerai => {
        const status = geraiStatuses[gerai.id];
        const statusEmoji = status.isOpen ? '🟢' : '🔴';
        const statusText = status.isOpen ? 'Open' : 'Closed';
        
        statusMessage += `${gerai.name}: ${statusEmoji} ${statusText}\n`;
        
        if (status.lastUpdated) {
            statusMessage += `Last Updated: ${status.lastUpdated}\n`;
            if (status.lastUpdatedBy) {
                statusMessage += `Updated by: @${status.lastUpdatedBy}\n`;
            }
        } else {
            statusMessage += 'No updates yet\n';
        }
        
        statusMessage += '\n'; // Add extra line break between gerai
    });
    
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