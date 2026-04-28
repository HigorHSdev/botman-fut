const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// A DATABASE_URL virá do Supabase (configurada no Render ou no .env local)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para Supabase/Render
    }
});

// Inicializar tabelas (PostgreSQL)
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                chat_id BIGINT PRIMARY KEY,
                username TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sent_news (
                url TEXT PRIMARY KEY,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Banco de dados PostgreSQL (Supabase) inicializado.');
    } catch (err) {
        console.error('❌ Erro ao inicializar PostgreSQL:', err.message);
    }
};

initDb();

module.exports = {
    // User operations
    getUsers: async () => {
        try {
            const res = await pool.query('SELECT chat_id FROM users');
            return res.rows.map(u => u.chat_id);
        } catch (err) {
            console.error('Erro ao buscar usuários:', err.message);
            return [];
        }
    },
    saveUser: async (chatId, username = null) => {
        try {
            const res = await pool.query(
                'INSERT INTO users (chat_id, username) VALUES ($1, $2) ON CONFLICT (chat_id) DO NOTHING',
                [chatId, username]
            );
            return res.rowCount > 0;
        } catch (err) {
            console.error('Erro ao salvar usuário:', err.message);
            return false;
        }
    },
    removeUser: async (chatId) => {
        try {
            const res = await pool.query('DELETE FROM users WHERE chat_id = $1', [chatId]);
            return res.rowCount > 0;
        } catch (err) {
            console.error('Erro ao remover usuário:', err.message);
            return false;
        }
    },

    // News operations
    isNewsSent: async (url) => {
        try {
            const res = await pool.query('SELECT 1 FROM sent_news WHERE url = $1', [url]);
            return res.rowCount > 0;
        } catch (err) {
            console.error('Erro ao verificar notícia:', err.message);
            return false;
        }
    },
    saveSentNews: async (url) => {
        try {
            await pool.query('INSERT INTO sent_news (url) VALUES ($1) ON CONFLICT (url) DO NOTHING', [url]);
            
            // Pruning opcional: Manter apenas os últimos 500
            await pool.query(`
                DELETE FROM sent_news 
                WHERE url NOT IN (
                    SELECT url FROM sent_news ORDER BY sent_at DESC LIMIT 500
                )
            `);
        } catch (err) {
            console.error('Erro ao salvar notícia enviada:', err.message);
        }
    }
};
