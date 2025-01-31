const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { getGeraiStatus, updateGeraiStatus, autoCloseAllGerai, isOperatingHours, addSubscriber, removeSubscriber } = require('./function');
const { GERAI_LIST } = require('./config');

dotenv.config();

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();

const bot = new TelegramBot(token, { polling: true });

const patchNotes = `
- Added more gerai
- Added vote system to update gerai status (no more trolling)
- Added notification when gerai is opened (use /subscribe to get notified)
`;

const lastUpdated = '1/2/2025 12.15 AM';

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
            'UiTM Jasin Gerai Checker 🏪\nWhat would you like to do?',
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: mainKeyboard.reply_markup
            }
        );
    } else if (action === 'gerai_status') {
        bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
    } else if (action === 'subscribe') {
        const response = addSubscriber(chatId);
        bot.sendMessage(chatId, response);
    } else if (action.startsWith('update_gerai')) {
        const geraiId = action.replace('update_', '');
        const username = query.from.username || 
                        `${query.from.first_name}${query.from.last_name ? ' ' + query.from.last_name : ''}`;
        
        // Pass notification callback to updateGeraiStatus
        const response = updateGeraiStatus(geraiId, username, (targetChatId, message) => {
            bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });
        });
        
        // First send the update confirmation
        await bot.sendMessage(chatId, response);
        
        // Then automatically show the current status of all gerai
        setTimeout(() => {
            bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        }, 500);

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
