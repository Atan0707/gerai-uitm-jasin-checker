const fs = require('fs');
const path = require('path');
const { GERAI_LIST, OPERATING_HOURS, ADMIN_IDS } = require('./config');

// Path to the subscriptions JSON file
const subscriptionsFilePath = path.join(__dirname, 'subscriptions.json');

// Helper function to read subscriptions from the JSON file
function readSubscriptions() {
    if (!fs.existsSync(subscriptionsFilePath)) {
        return { subscribers: [] };
    }
    const data = fs.readFileSync(subscriptionsFilePath);
    return JSON.parse(data);
}

// Helper function to write subscriptions to the JSON file
function writeSubscriptions(subscriptions) {
    fs.writeFileSync(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2));
}

// Helper function to check if current time is within operating hours
function isOperatingHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour < OPERATING_HOURS.end && hour >= OPERATING_HOURS.start;
}

// Add subscribers tracking
let subscribers = new Set(); // Store chat IDs of subscribers
let geraiStatuses = {};

// Initialize statuses
GERAI_LIST.forEach(gerai => {
    geraiStatuses[gerai.id] = { 
        isOpen: false, 
        lastUpdated: null,
        lastUpdatedBy: null 
    };
});

// Add subscriber management functions
function addSubscriber(chatId) {
    const subscriptions = readSubscriptions();
    if (!subscriptions.subscribers.includes(chatId)) {
        subscriptions.subscribers.push(chatId);
        writeSubscriptions(subscriptions);
        return `✅ You will be notified when gerai opens!`;
    }
    return `⚠️ You are already subscribed!`;
}

function removeSubscriber(chatId) {
    const subscriptions = readSubscriptions();
    const index = subscriptions.subscribers.indexOf(chatId);
    if (index !== -1) {
        subscriptions.subscribers.splice(index, 1);
        writeSubscriptions(subscriptions);
        return `❌ You will no longer receive notifications.`;
    }
    return `⚠️ You are not subscribed!`;
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
    
    for (const [geraiId, status] of Object.entries(geraiStatuses)) {
        const geraiInfo = GERAI_LIST.find(g => g.id === geraiId);
        const geraiName = geraiInfo ? geraiInfo.name : geraiId.replace('gerai', 'Gerai ');
        
        const statusEmoji = status.isOpen ? '🟢' : '🔴';
        const statusText = status.isOpen ? 'Open' : 'Closed';
        const updateInfo = status.lastUpdated 
            ? `\nLast Updated: ${status.lastUpdated}`
            : '\nNo updates yet';
            
        statusMessage += `${geraiName}: ${statusEmoji} ${statusText}${updateInfo}\n\n`;
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

    const previousStatus = geraiStatuses[geraiId].isOpen;
    geraiStatuses[geraiId].isOpen = !previousStatus;
    geraiStatuses[geraiId].lastUpdated = new Date().toLocaleString();
    geraiStatuses[geraiId].lastUpdatedBy = username;

    const geraiNumber = geraiId.replace('gerai', 'Gerai ');

    // If gerai is newly opened, notify subscribers
    if (!previousStatus && geraiStatuses[geraiId].isOpen) {
        const notificationMessage = `🔔 *${geraiNumber} is now OPEN!*\nUpdated by: @${username}`;
        
        // Notify all subscribers
        if (notifyCallback) {
            const subscriptions = readSubscriptions();
            subscriptions.subscribers.forEach(chatId => {
                notifyCallback(chatId, notificationMessage);
            });
        }
    }

    return `✅ ${geraiNumber} status updated to: ${!previousStatus ? 'Open 🟢' : 'Closed 🔴'}\nUpdated by: @${username}`;
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

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

function adminUpdateGeraiStatus(geraiId, isOpen, adminUsername) {
    if (!geraiStatuses[geraiId]) {
        return 'Invalid gerai selected';
    }

    const previousStatus = geraiStatuses[geraiId].isOpen;
    geraiStatuses[geraiId].isOpen = isOpen;
    geraiStatuses[geraiId].lastUpdated = new Date().toLocaleString();
    geraiStatuses[geraiId].lastUpdatedBy = `${adminUsername} (Admin)`;

    const geraiNumber = geraiId.replace('gerai', 'Gerai ');
    return `🔧 Admin Update: ${geraiNumber} status set to: ${isOpen ? 'Open 🟢' : 'Closed 🔴'}\nUpdated by: @${adminUsername} (Admin)`;
}

module.exports = {
    getGeraiStatus,
    updateGeraiStatus,
    autoCloseAllGerai,
    isOperatingHours,
    addSubscriber,
    removeSubscriber,
    isAdmin,
    adminUpdateGeraiStatus
};