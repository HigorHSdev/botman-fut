const { Telegraf } = require('telegraf');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function checkBot() {
    try {
        const me = await bot.telegram.getMe();
        console.log('Bot Info:', me);
        console.log('✅ Token is valid!');
    } catch (err) {
        console.error('❌ Token is invalid or connection failed:', err.message);
    }
}

checkBot();
