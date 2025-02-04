const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { getGeraiStatus, updateGeraiStatus, autoCloseAllGerai, isOperatingHours, addSubscriber, removeSubscriber, isAdmin, adminUpdateGeraiStatus, getGeraiStatusUpdateButtons } = require('./function');
const { GERAI_LIST, ADMIN_IDS } = require('./config');

dotenv.config();

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();

const bot = new TelegramBot(token, {
    polling: {
        autoStart: true,
        params: {
            timeout: 10,
            limit: 100,
            retryAfter: 5000
        }
    }
});

const patchNotes = `
`;

const lastUpdated = '5/2/2025 1.35 AM';

// Schedule auto-close at midnight
function scheduleAutoClose() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    
    const timeUntilMidnight = midnight - now;
    
    setTimeout(() => {
        autoCloseAllGerai();
        // Schedule next day's auto-close
        scheduleAutoClose();
    }, timeUntilMidnight);
}

// Start the auto-close schedule when the bot starts
scheduleAutoClose();

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // Check if within operating hours
    // if (!isOperatingHours()) {
    //     bot.sendMessage(
    //         chatId, 
    //         '⏰ *Outside Operating Hours*\nAll gerai are closed.\nOperating Hours: 7:00 AM - 12:00 AM',
    //         { parse_mode: 'Markdown' }
    //     );
    //     return;
    // }
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Update Gerai Status 🔄', callback_data: 'show_update_options' }
                ],
                [
                    { text: '📊 Check All Gerai Status', callback_data: 'gerai_status' }
                ],
                [
                    { text: '🔔 Subscribe to Updates', callback_data: 'subscribe' }
                ],
                [
                    { text: '📝 Give Feedback', url: 'https://forms.gle/QLhhJUapcNyVqEem7' }
                ]
            ]
        }
    };
  
    bot.sendMessage(
        chatId, 
        'UiTM Jasin Gerai Checker 🏪\n\nApp last updated: ' + lastUpdated + '\n\nPatch notes:' + patchNotes, 
        keyboard
    );
});

bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const username = callbackQuery.from.username || 'Anonymous';

    if (data === 'remove_message') {
        // Delete the message when close is clicked
        await bot.deleteMessage(chatId, messageId);
        await bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    if (data === 'back_to_main') {
        // Return to main menu
        const mainKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Update Gerai Status 🔄', callback_data: 'show_update_options' }
                    ],
                    [
                        { text: '📊 Check All Gerai Status', callback_data: 'gerai_status' }
                    ],
                    [
                        { text: '🔔 Subscribe to Updates', callback_data: 'subscribe' }
                    ]
                ]
            }
        };
        
        await bot.editMessageText(
            'UiTM Jasin Gerai Checker 🏪\n\nApp last updated: ' + lastUpdated + '\n\nPatch notes:' + patchNotes,
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: mainKeyboard.reply_markup
            }
        );
        return; // Add return here to prevent further execution
    }

    if (data.startsWith('update_')) {
        const geraiId = data.replace('update_', '');
        // Show Open/Close buttons for the selected gerai
        const buttons = getGeraiStatusUpdateButtons(geraiId);
        await bot.editMessageText(buttons.text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: buttons.reply_markup,
            parse_mode: buttons.parse_mode
        });
    } else if (data.startsWith('open_') || data.startsWith('close_')) {
        const geraiId = data.substring(data.indexOf('_') + 1);
        const isOpen = data.startsWith('open_');
        
        const response = updateGeraiStatus(geraiId, username, (targetChatId, message, options) => {
            bot.sendMessage(targetChatId, message, options);
        }, isOpen);

        await bot.answerCallbackQuery(callbackQuery.id, {
            text: isOpen ? '🟢 Opening gerai...' : '🔴 Closing gerai...',
            show_alert: false
        });
        
        // Show success message and return to status menu
        await bot.editMessageText(response, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 Check Status', callback_data: 'check_status' }],
                    [{ text: '🔄 Update Another Gerai', callback_data: 'show_update_options' }]
                ]
            }
        });
    } else if (data === 'show_update_options') {
        // Split gerai by location
        const medanKuliahGerai = GERAI_LIST.filter(gerai => gerai.location === 'medan_kuliah');
        const medanKolejGerai = GERAI_LIST.filter(gerai => gerai.location === 'medan_kolej');
        const pppGerai = GERAI_LIST.filter(gerai => gerai.location === 'ppp');
        
        const buttons = [];
        
        // Add Medan Kuliah section
        buttons.push([{ text: '📍 MEDAN KULIAH', callback_data: 'dummy_action' }]);
        medanKuliahGerai.reduce((acc, gerai, index) => {
            const button = { text: gerai.name, callback_data: `update_${gerai.id}` };
            
            // Create new row every 2 buttons
            if (index % 2 === 0) {
                buttons.push([button]);
            } else {
                buttons[buttons.length - 1].push(button);
            }
            return acc;
        }, []);
        
        // Add Medan Kolej section
        buttons.push([{ text: '📍 MEDAN KOLEJ', callback_data: 'dummy_action' }]);
        medanKolejGerai.reduce((acc, gerai, index) => {
            const button = { text: gerai.name, callback_data: `update_${gerai.id}` };
            
            // Create new row every 2 buttons
            if (index % 2 === 0) {
                buttons.push([button]);
            } else {
                buttons[buttons.length - 1].push(button);
            }
            return acc;
        }, []);

        // Add PPP section
        if (pppGerai.length > 0) {
            buttons.push([{ text: '📍 PUSAT PERSATUAN PELAJAR (PPP)', callback_data: 'dummy_action' }]);
            pppGerai.forEach(gerai => {
                buttons.push([{ text: gerai.name, callback_data: `update_${gerai.id}` }]);
            });
        }

        // Add back button
        buttons.push([{ text: '🔙 Back to Main Menu', callback_data: 'back_to_main' }]);

        const updateKeyboard = {
            reply_markup: {
                inline_keyboard: buttons
            }
        };
        
        bot.editMessageText(
            'Select a gerai to update its status:',
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: updateKeyboard.reply_markup
            }
        );
    } else if (data === 'gerai_status' || data === 'check_status') {
        const status = getGeraiStatus();
        bot.sendMessage(chatId, status.text, status.options);
    } else if (data === 'show_admin_open' || data === 'show_admin_close') {
        if (!isAdmin(callbackQuery.from.id)) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '⛔ Admin access required' });
            return;
        }

        const prefix = data === 'show_admin_open' ? 'admin_open_' : 'admin_close_';
        const medanKuliahGerai = GERAI_LIST.filter(gerai => gerai.location === 'medan_kuliah');
        const medanKolejGerai = GERAI_LIST.filter(gerai => gerai.location === 'medan_kolej');
        const pppGerai = GERAI_LIST.filter(gerai => gerai.location === 'ppp');
        
        const buttons = [];
        
        // Add Medan Kuliah section
        buttons.push([{ text: '📍 MEDAN KULIAH', callback_data: 'dummy_action' }]);
        medanKuliahGerai.forEach(gerai => {
            buttons.push([{ text: gerai.name, callback_data: `${prefix}${gerai.id}` }]);
        });
        
        // Add Medan Kolej section
        buttons.push([{ text: '📍 MEDAN KOLEJ', callback_data: 'dummy_action' }]);
        medanKolejGerai.forEach(gerai => {
            buttons.push([{ text: gerai.name, callback_data: `${prefix}${gerai.id}` }]);
        });

        // Add PPP section
        if (pppGerai.length > 0) {
            buttons.push([{ text: '📍 PUSAT PERSATUAN PELAJAR (PPP)', callback_data: 'dummy_action' }]);
            pppGerai.forEach(gerai => {
                buttons.push([{ text: gerai.name, callback_data: `${prefix}${gerai.id}` }]);
            });
        }

        // Add back button
        buttons.push([{ text: '🔙 Back to Admin Menu', callback_data: 'back_to_admin' }]);

        bot.editMessageText(
            data === 'show_admin_open' ? '🟢 Select gerai to OPEN:' : '🔴 Select gerai to CLOSE:',
            {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: buttons }
            }
        );
    } else if (data === 'back_to_admin') {
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🟢 Open Gerai', callback_data: 'show_admin_open' },
                        { text: '🔴 Close Gerai', callback_data: 'show_admin_close' }
                    ]
                ]
            }
        };

        bot.editMessageText(
            '🔧 *Admin Control Panel*\nSelect an action:',
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            }
        );
    } else if (data.startsWith('admin_open_')) {
        if (!isAdmin(callbackQuery.from.id)) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '⛔ Admin access required' });
            return;
        }

        const geraiId = data.replace('admin_open_', '');
        const response = adminUpdateGeraiStatus(geraiId, true, callbackQuery.from.username);
        await bot.sendMessage(chatId, response);
        
        // Send updated status
        setTimeout(() => {
            bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        }, 500);
    } else if (data.startsWith('admin_close_')) {
        if (!isAdmin(callbackQuery.from.id)) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '⛔ Admin access required' });
            return;
        }

        const geraiId = data.replace('admin_close_', '');
        const response = adminUpdateGeraiStatus(geraiId, false, callbackQuery.from.username);
        await bot.sendMessage(chatId, response);
        
        // Send updated status
        setTimeout(() => {
            bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        }, 500);
    } else if (data === 'subscribe') {
        const response = addSubscriber(chatId);
        bot.sendMessage(chatId, response);
    }

    // Answer the callback query to remove the loading state
    bot.answerCallbackQuery(callbackQuery.id);
});

// Add notification commands
bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;
    const response = addSubscriber(chatId);
    bot.sendMessage(chatId, response);
});

bot.onText(/\/unsubscribe/, (msg) => {
    const chatId = msg.chat.id;
    const response = removeSubscriber(chatId);
    bot.sendMessage(chatId, response);
});

// Add error handlers
bot.on('polling_error', async (error) => {
    console.log('Polling error occurred:', error.message);
    
    try {
        // Stop polling on error
        await bot.stopPolling();
        console.log('Polling stopped, waiting to restart...');
        
        // Wait 5 seconds before trying to reconnect
        setTimeout(async () => {
            try {
                await bot.startPolling();
                console.log('Polling restarted successfully');
            } catch (restartError) {
                console.error('Failed to restart polling:', restartError);
            }
        }, 5000);
    } catch (stopError) {
        console.error('Error stopping polling:', stopError);
    }
});

// Add general error handler
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Admin command to show options
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        bot.sendMessage(chatId, '⛔ This command is only available to administrators.');
        return;
    }

    // Create keyboard buttons dynamically from config
    const openButtons = GERAI_LIST.reduce((acc, gerai, index) => {
        const button = { text: `Open ${gerai.name}`, callback_data: `admin_open_${gerai.id}` };
        
        // Create new row for each button
        acc.push([button]);
        return acc;
    }, []);

    const closeButtons = GERAI_LIST.reduce((acc, gerai, index) => {
        const button = { text: `Close ${gerai.name}`, callback_data: `admin_close_${gerai.id}` };
        
        // Create new row for each button
        acc.push([button]);
        return acc;
    }, []);

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🟢 Open Gerai', callback_data: 'show_admin_open' },
                    { text: '🔴 Close Gerai', callback_data: 'show_admin_close' }
                ]
            ]
        }
    };

    bot.sendMessage(
        chatId, 
        '🔧 *Admin Control Panel*\nSelect an action:',
        { 
            parse_mode: 'Markdown',
            reply_markup: keyboard.reply_markup 
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
