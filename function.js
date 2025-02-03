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

// Add at the top with other global variables
let testingMode = false; // New global variable for testing mode

// Add geraiStatuses initialization
let geraiStatuses = {};

// Initialize statuses
GERAI_LIST.forEach(gerai => {
    geraiStatuses[gerai.id] = { 
        isOpen: false, 
        lastUpdated: null,
        lastUpdatedBy: null 
    };
});

// Helper function to check if current time is within operating hours
function isOperatingHours() {
    if (testingMode) {
        return true; // Always return true when in testing mode
    }
    const now = new Date();
    const hour = now.getHours();
    return hour < OPERATING_HOURS.end && hour >= OPERATING_HOURS.start;
}

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
        return {
            text: statusMessage,
            options: {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔄 Update Gerai Status', callback_data: 'show_update_options' }]
                    ]
                }
            }
        };
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
        const updatedBy = status.lastUpdatedBy
            ? `\nUpdated by: @${status.lastUpdatedBy}`
            : '';
            
        statusMessage += `${geraiName}: ${statusEmoji} ${statusText}${updateInfo}${updatedBy}\n\n`;
    }
    
    return {
        text: statusMessage,
        options: {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔄 Update Gerai Status', callback_data: 'show_update_options' }]
                ]
            }
        }
    };
}

function getGeraiStatusUpdateButtons(geraiId) {
    const geraiInfo = GERAI_LIST.find(g => g.id === geraiId);
    const geraiName = geraiInfo ? geraiInfo.name : geraiId.replace('gerai', 'Gerai ');
    
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🟢 Open', callback_data: `open_${geraiId}` },
                    { text: '🔴 Close', callback_data: `close_${geraiId}` }
                ],
                [{ text: '⬅️ Back to Gerai List', callback_data: 'show_update_options' }]
            ]
        },
        parse_mode: 'Markdown',
        text: `*Select status for ${geraiName}:*\nCurrent status: ${geraiStatuses[geraiId]?.isOpen ? '🟢 Open' : '🔴 Closed'}`
    };
}

// Modify updateGeraiStatus to accept specific status
function updateGeraiStatus(geraiId, username, notifyCallback, forceStatus = null) {
    // Check if within operating hours
    if (!isOperatingHours()) {
        return '⛔ Updates are disabled outside operating hours (12 AM - 7 AM).\nAll gerai are closed during this time.';
    }

    if (!geraiStatuses[geraiId]) {
        return 'Invalid gerai selected';
    }

    // Get the full gerai name from GERAI_LIST first
    const geraiInfo = GERAI_LIST.find(g => g.id === geraiId);
    const geraiName = geraiInfo ? geraiInfo.name : geraiId.replace('gerai', 'Gerai ');

    const previousStatus = geraiStatuses[geraiId].isOpen;
    // Use forceStatus if provided, otherwise toggle the current status
    const newStatus = forceStatus !== null ? forceStatus : !previousStatus;
    
    // If the status isn't changing, return early with a message
    if (previousStatus === newStatus) {
        return `⚠️ ${geraiName} is already ${newStatus ? 'Open 🟢' : 'Closed 🔴'}`;
    }

    geraiStatuses[geraiId].isOpen = newStatus;
    geraiStatuses[geraiId].lastUpdated = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    geraiStatuses[geraiId].lastUpdatedBy = username;

    // Notify subscribers for both open and close status changes
    if (notifyCallback) {
        const notificationMessage = newStatus 
            ? `🔔 *${geraiName} is now OPEN!*\nUpdated by: @${username}`
            : `🔔 *${geraiName} is now CLOSED!*\nUpdated by: @${username}`;
        
        // Create inline keyboard for the notification
        const notificationOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 Check All Gerai Status', callback_data: 'check_status' }]
                ]
            }
        };
        
        // Notify all subscribers with the inline keyboard
        const subscriptions = readSubscriptions();
        subscriptions.subscribers.forEach(chatId => {
            notifyCallback(chatId, notificationMessage, notificationOptions);
        });
    }

    return `✅ ${geraiName} status updated to: ${newStatus ? 'Open 🟢' : 'Closed 🔴'}\nUpdated by: @${username}`;
}

// Function to automatically close all gerai at midnight
function autoCloseAllGerai() {
    for (const gerai in geraiStatuses) {
        if (geraiStatuses[gerai].isOpen) {
            geraiStatuses[gerai].isOpen = false;
            geraiStatuses[gerai].lastUpdated = new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
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
    geraiStatuses[geraiId].lastUpdated = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    geraiStatuses[geraiId].lastUpdatedBy = `${adminUsername} (Admin)`;

    const geraiNumber = geraiId.replace('gerai', 'Gerai ');
    return `🔧 Admin Update: ${geraiNumber} status set to: ${isOpen ? 'Open 🟢' : 'Closed 🔴'}\nUpdated by: @${adminUsername} (Admin)`;
}

// Add new functions to toggle testing mode
function enableTestingMode() {
    testingMode = true;
    return '🔧 Testing mode enabled. Operating hours check bypassed.';
}

function disableTestingMode() {
    testingMode = false;
    return '🔧 Testing mode disabled. Operating hours check restored.';
}

function getTestingMode() {
    return testingMode;
}

module.exports = {
    getGeraiStatus,
    updateGeraiStatus,
    autoCloseAllGerai,
    isOperatingHours,
    addSubscriber,
    removeSubscriber,
    isAdmin,
    adminUpdateGeraiStatus,
    enableTestingMode,
    disableTestingMode,
    getTestingMode,
    getGeraiStatusUpdateButtons
};