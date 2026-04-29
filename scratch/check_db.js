const db = require('./execution/telegram_bot/database');

async function checkDb() {
    try {
        const users = await db.getUsers();
        console.log(`Users in DB: ${users.length}`);
        console.log('User IDs:', users);

        // Also check how many sent news we have
        const { Pool } = require('pg');
        const path = require('path');
        require('dotenv').config({ path: path.join(__dirname, './.env') });
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        const resNews = await pool.query('SELECT count(*) FROM sent_news');
        console.log(`Sent news in DB: ${resNews.rows[0].count}`);
        
        await pool.end();
    } catch (error) {
        console.error('Error checking DB:', error);
    }
}

checkDb();
