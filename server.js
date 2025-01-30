const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const { getGeraiStatus, updateGeraiStatus, autoCloseAllGerai, isOperatingHours } = require('./function');

dotenv.config();

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();

const bot = new TelegramBot(token, { polling: true });

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
                ]
            ]
        }
    };
  
    bot.sendMessage(
        chatId, 
        'UiTM Jasin Gerai Checker 🏪\nWhat would you like to do?', 
        keyboard
    );
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const action = query.data;
    const username = query.from.username || `${query.from.first_name} ${query.from.last_name || ''}`;

    if (action === 'show_update_options') {
        const updateKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Gerai 11', callback_data: 'update_gerai11' },
                        { text: 'Gerai 12', callback_data: 'update_gerai12' },
                        { text: 'Gerai 13', callback_data: 'update_gerai13' }
                    ],
                    [
                        { text: 'Gerai 14', callback_data: 'update_gerai14' },
                        { text: 'Gerai 15', callback_data: 'update_gerai15' }
                    ],
                    [
                        { text: '🔙 Back to Main Menu', callback_data: 'back_to_main' }
                    ]
                ]
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
    } else if (action.startsWith('update_gerai')) {
        const geraiId = action.replace('update_', '');
        const response = updateGeraiStatus(geraiId, username);
        
        // First send the update confirmation
        await bot.sendMessage(chatId, response);
        
        // Then automatically show the current status of all gerai
        setTimeout(() => {
            bot.sendMessage(chatId, getGeraiStatus(), { parse_mode: 'Markdown' });
        }, 500);
        
        // Return to update options menu
        const updateKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Gerai 11', callback_data: 'update_gerai11' },
                        { text: 'Gerai 12', callback_data: 'update_gerai12' },
                        { text: 'Gerai 13', callback_data: 'update_gerai13' }
                    ],
                    [
                        { text: 'Gerai 14', callback_data: 'update_gerai14' },
                        { text: 'Gerai 15', callback_data: 'update_gerai15' }
                    ],
                    [
                        { text: '🔙 Back to Main Menu', callback_data: 'back_to_main' }
                    ]
                ]
            }
        };
        
        setTimeout(() => {
            bot.editMessageText(
                'Select another gerai to update its status:',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    reply_markup: updateKeyboard.reply_markup
                }
            );
        }, 1000);
    }

    // Answer the callback query to remove the loading state
    bot.answerCallbackQuery(query.id);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
