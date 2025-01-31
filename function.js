const { GERAI_LIST, OPERATING_HOURS } = require('./config');

// Helper function to check if current time is within operating hours
function isOperatingHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour < OPERATING_HOURS.end && hour >= OPERATING_HOURS.start;
}

// Add subscribers tracking
let subscribers = new Set(); // Store chat IDs of subscribers
let geraiStatuses = {};
let pendingVotes = {};

// Initialize statuses
GERAI_LIST.forEach(gerai => {
    geraiStatuses[gerai.id] = { 
        isOpen: false, 
        lastUpdated: null,
        lastUpdatedBy: null 
    };
    pendingVotes[gerai.id] = {
        targetStatus: null,
        voters: [],
        timestamp: null
    };
});

// Add subscriber management functions
function addSubscriber(chatId) {
    subscribers.add(chatId);
    return `✅ You will be notified when gerai opens!`;
}

function removeSubscriber(chatId) {
    subscribers.delete(chatId);
    return `❌ You will no longer receive notifications.`;
}

function getGeraiStatus() {
    // If outside operating hours, show all gerai as closed
    if (!isOperatingHours()) {
        let statusMessage = '⏰ *Outside Operating Hours*\nAll gerai are closed.\n\n';
        statusMessage += `Operating Hours: ${OPERATING_HOURS.start}:00 AM - 12:00 AM\n\n`;
        
        GERAI_LIST.forEach(gerai => {
            statusMessage += `${gerai.name}: 🔴 Closed\n`;
        });
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
            ? `\nUpdated by: @${status.lastUpdatedBy}`
            : '';
            
        // Add pending votes information
        const pendingVote = pendingVotes[gerai];
        const pendingInfo = pendingVote.voters.length > 0
            ? `\n⏳ Pending ${pendingVote.targetStatus} vote: ${pendingVote.voters.length}/2`
            : '';
            
        statusMessage += `${geraiNumber}: ${statusEmoji} ${statusText}${updateInfo}${updatedBy}${pendingInfo}\n\n`;
    }
    
    return statusMessage;
}

function updateGeraiStatus(geraiId, username, notifyCallback) {
    // Check if within operating hours
    if (!isOperatingHours()) {
        return '⛔ Updates are disabled outside operating hours (12 AM - 7 AM).\nAll gerai are closed during this time.';
    }

    if (!geraiStatuses[geraiId]) {
        return 'Invalid gerai selected';
    }

    const currentStatus = geraiStatuses[geraiId].isOpen;
    const targetStatus = !currentStatus ? 'open' : 'close';
    const geraiNumber = geraiId.replace('gerai', 'Gerai ');

    // Check if user has already voted
    if (pendingVotes[geraiId].voters.includes(username)) {
        return `⚠️ You have already voted to ${targetStatus} ${geraiNumber}`;
    }

    // Reset votes if targeting different status or if votes are too old (5 minutes)
    if (pendingVotes[geraiId].targetStatus !== targetStatus || 
        (pendingVotes[geraiId].timestamp && Date.now() - pendingVotes[geraiId].timestamp > 300000)) {
        pendingVotes[geraiId] = {
            targetStatus: targetStatus,
            voters: [username],
            timestamp: Date.now()
        };
        return `✅ First vote to ${targetStatus} ${geraiNumber} (1/2 votes needed)`;
    }

    // Add vote
    pendingVotes[geraiId].voters.push(username);

    // If we have 2 votes, update the status
    if (pendingVotes[geraiId].voters.length >= 2) {
        const previousStatus = geraiStatuses[geraiId].isOpen;
        geraiStatuses[geraiId].isOpen = !previousStatus;
        geraiStatuses[geraiId].lastUpdated = new Date().toLocaleString();
        geraiStatuses[geraiId].lastUpdatedBy = pendingVotes[geraiId].voters.join(', @');

        // Reset pending votes
        pendingVotes[geraiId] = {
            targetStatus: null,
            voters: [],
            timestamp: null
        };

        // If gerai is newly opened, notify subscribers
        if (!previousStatus && geraiStatuses[geraiId].isOpen) {
            const notificationMessage = `🔔 *${geraiNumber} is now OPEN!*\nUpdated by: @${geraiStatuses[geraiId].lastUpdatedBy}`;
            
            // Notify all subscribers
            if (notifyCallback) {
                subscribers.forEach(chatId => {
                    notifyCallback(chatId, notificationMessage);
                });
            }
        }

        return `✅ ${geraiNumber} status updated to: ${!previousStatus ? 'Open 🟢' : 'Closed 🔴'}\nConfirmed by: @${geraiStatuses[geraiId].lastUpdatedBy}`;
    }

    return `✅ Vote recorded to ${targetStatus} ${geraiNumber} (${pendingVotes[geraiId].voters.length}/2 votes needed)`;
}

// Function to automatically close all gerai at midnight
function autoCloseAllGerai() {
    for (const gerai in geraiStatuses) {
        if (geraiStatuses[gerai].isOpen) {
            geraiStatuses[gerai].isOpen = false;
            geraiStatuses[gerai].lastUpdated = new Date().toLocaleString();
            geraiStatuses[gerai].lastUpdatedBy = 'System (Auto-close)';
        }
        // Reset any pending votes
        pendingVotes[gerai] = {
            targetStatus: null,
            voters: [],
            timestamp: null
        };
    }
}

module.exports = {
    getGeraiStatus,
    updateGeraiStatus,
    autoCloseAllGerai,
    isOperatingHours,
    addSubscriber,
    removeSubscriber
};