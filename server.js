const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { getGeraiStatus, updateGeraiStatus, autoCloseAllGerai, isOperatingHours, addSubscriber, removeSubscriber, isAdmin, adminUpdateGeraiStatus } = require('./function');
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
- Added Tanjung to the list
- Added updated by who (to avoid trolling)
- Added notification for closed gerai
- Added button on notification to check all gerai status
- Added gerai ayam gepuk, kedai saleh, kedai waffle
`;

const lastUpdated = '3/2/2025 12.58 PM';

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

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;
    const username = query.from.username || `${query.from.first_name} ${query.from.last_name || ''}`;

    if (action === 'show_update_options') {
        // Create keyboard buttons dynamically from config
        const buttons = GERAI_LIST.reduce((acc, gerai, index) => {
            const button = { text: gerai.name, callback_data: `update_${gerai.id}` };
            
            // Create new row every 2 buttons
            if (index % 2 === 0) {
                acc.push([button]);
            } else {
                acc[acc.length - 1].push(button);
            }
            return acc;
        }, []);

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
                message_id: query.message.message_id,
                reply_markup: updateKeyboard.reply_markup
            }
        );
    } else if (action === 'back_to_main') {
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
        
        bot.editMessageText(
            'UiTM Jasin Gerai Checker 🏪\n\nApp last updated: ' + lastUpdated + '\n\nPatch notes:' + patchNotes,
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: mainKeyboard.reply_markup
            }
        );
    } else if (action === 'gerai_status') {
        bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
    } else if (action.startsWith('update_')) {
        const geraiId = action.replace('update_', '');
        const username = query.from.username || 
                        `${query.from.first_name}${query.from.last_name ? ' ' + query.from.last_name : ''}`;
        
        // Pass notification callback to updateGeraiStatus
        const response = updateGeraiStatus(geraiId, username, (targetChatId, message, options) => {
            bot.sendMessage(targetChatId, message, options);
        });
        
        // First send the update confirmation
        await bot.sendMessage(chatId, response);
        
        // Then automatically show the current status of all gerai
        // setTimeout(() => {
        //     bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        // }, 500);

        // Create dynamic keyboard again for the update menu
        const buttons = GERAI_LIST.reduce((acc, gerai, index) => {
            const button = { text: gerai.name, callback_data: `update_${gerai.id}` };
            
            // Create new row every 2 buttons
            if (index % 2 === 0) {
                acc.push([button]);
            } else {
                acc[acc.length - 1].push(button);
            }
            return acc;
        }, []);

        // Add back button
        buttons.push([{ text: '🔙 Back to Main Menu', callback_data: 'back_to_main' }]);
        
        setTimeout(() => {
            bot.editMessageText(
                'Select another gerai to update its status:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    reply_markup: { inline_keyboard: buttons }
                }
            );
        }, 1000);
    } else if (action === 'show_admin_open') {
        if (!isAdmin(query.from.id)) {
            bot.answerCallbackQuery(query.id, { text: '⛔ Admin access required' });
            return;
        }

        const buttons = GERAI_LIST.reduce((acc, gerai, index) => {
            const button = { text: gerai.name, callback_data: `admin_open_${gerai.id}` };
            acc.push([button]);
            return acc;
        }, []);

        // Add back button
        buttons.push([{ text: '🔙 Back to Admin Menu', callback_data: 'back_to_admin' }]);

        bot.editMessageText(
            '🟢 Select gerai to OPEN:',
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: { inline_keyboard: buttons }
            }
        );
    } else if (action === 'show_admin_close') {
        if (!isAdmin(query.from.id)) {
            bot.answerCallbackQuery(query.id, { text: '⛔ Admin access required' });
            return;
        }

        const buttons = GERAI_LIST.reduce((acc, gerai, index) => {
            const button = { text: gerai.name, callback_data: `admin_close_${gerai.id}` };
            acc.push([button]);
            return acc;
        }, []);

        // Add back button
        buttons.push([{ text: '🔙 Back to Admin Menu', callback_data: 'back_to_admin' }]);

        bot.editMessageText(
            '🔴 Select gerai to CLOSE:',
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: { inline_keyboard: buttons }
            }
        );
    } else if (action === 'back_to_admin') {
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
                message_id: query.message.message_id,
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            }
        );
    } else if (action.startsWith('admin_open_')) {
        if (!isAdmin(query.from.id)) {
            bot.answerCallbackQuery(query.id, { text: '⛔ Admin access required' });
            return;
        }

        const geraiId = action.replace('admin_open_', '');
        const response = adminUpdateGeraiStatus(geraiId, true, query.from.username);
        await bot.sendMessage(chatId, response);
        
        // Send updated status
        setTimeout(() => {
            bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        }, 500);
    } else if (action.startsWith('admin_close_')) {
        if (!isAdmin(query.from.id)) {
            bot.answerCallbackQuery(query.id, { text: '⛔ Admin access required' });
            return;
        }

        const geraiId = action.replace('admin_close_', '');
        const response = adminUpdateGeraiStatus(geraiId, false, query.from.username);
        await bot.sendMessage(chatId, response);
        
        // Send updated status
        setTimeout(() => {
            bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        }, 500);
    } else if (action === 'subscribe') {
        const response = addSubscriber(chatId);
        bot.sendMessage(chatId, response);
    } else if (action === 'check_status') {
        const status = getGeraiStatus();
        await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
        // Answer the callback query to remove the loading state
        await bot.answerCallbackQuery(query.id);
    }

    // Answer the callback query to remove the loading state
    bot.answerCallbackQuery(query.id);
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
