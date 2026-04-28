const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const path = require('path');
const http = require('http'); // Para o Health Check do Render
const db = require('./database');
const { getNewArticles, NEWS_SOURCES, formatArticleMessage } = require('./newsService');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ ERRO: TELEGRAM_BOT_TOKEN não encontrado no arquivo .env');
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ==========================================
// HEALTH CHECK SERVER (Necessário para o Render)
// ==========================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Botman is alive!\n');
}).listen(PORT, () => {
    console.log(`✅ Server de Health Check rodando na porta ${PORT}`);
});

// Register chat (user or group)
async function registerChat(ctx) {
    const chatId = ctx.chat.id;
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    const chatName = isGroup ? ctx.chat.title : (ctx.from?.first_name || 'Usuário');

    if (await db.saveUser(chatId, chatName)) {
        const welcomeMsg = `⚽ *Bem-vindo ao Botman!*\n\n` +
            `${chatName}, você agora receberá as últimas notícias do futebol em tempo real!\n\n` +
            `📡 *Fontes:* Brasil (GE, TNT, UOL) + Internacional (BBC, Sky, Marca...)\n` +
            `⏰ *Atualização:* Automática a cada 5 minutos\n\n` +
            `🔹 /latest - Ver últimas notícias agora\n` +
            `🔹 /fontes - Ver todas as fontes de notícias\n` +
            `🔹 /help - Ajuda`;
        ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });
    } else {
        ctx.reply('✅ Este chat já está registrado para receber notícias!');
    }
}

// =====================
// COMANDOS DO BOT
// =====================

bot.start(async (ctx) => {
    await registerChat(ctx);
});

bot.on('new_chat_members', async (ctx) => {
    const isBotAdded = ctx.message.new_chat_members.some(member => member.id === ctx.botInfo.id);
    if (isBotAdded) {
        await registerChat(ctx);
    }
});

bot.command('latest', async (ctx) => {
    await ctx.reply('🔍 Buscando as últimas notícias de futebol...');
    
    try {
        const articles = await getNewArticles();
        if (!articles || articles.length === 0) {
            await ctx.reply('📭 Nenhuma notícia nova no momento. Tente novamente em alguns minutos!');
        } else {
            const toSend = articles.slice(0, 5);
            for (const article of toSend) {
                const msg = formatArticleMessage(article);
                try {
                    await ctx.reply(msg, { parse_mode: 'MarkdownV2', disable_web_page_preview: false });
                } catch (err) {
                    await ctx.reply(`${article.emoji} ${article.title}\n\n${article.url}`);
                }
                await new Promise(r => setTimeout(r, 500));
            }
            if (articles.length > 5) {
                await ctx.reply(`📊 Mostrando 5 de ${articles.length} notícias novas encontradas.`);
            }
        }
    } catch (error) {
        console.error('Erro no /latest:', error.message);
        await ctx.reply('❌ Erro ao buscar notícias. Tente novamente.');
    }
});

bot.command('fontes', async (ctx) => {
    let msg = '📡 *Fontes de Notícias Ativas:*\n\n';
    const br = NEWS_SOURCES.filter(s => s.isPortuguese);
    const intl = NEWS_SOURCES.filter(s => !s.isPortuguese);

    msg += '🇧🇷 *Nacionais:*\n';
    br.forEach(s => msg += `${s.emoji} ${s.name}\n`);
    
    msg += '\n🌍 *Internacionais:*\n';
    intl.forEach(s => msg += `${s.emoji} ${s.name}\n`);
    
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('help', async (ctx) => {
    const msg = `🤖 *Botman - Bot de Notícias de Futebol*\n\n` +
        `*Comandos disponíveis:*\n\n` +
        `🔹 /start - Registrar para receber notícias\n` +
        `🔹 /latest - Ver últimas notícias agora\n` +
        `🔹 /fontes - Ver fontes de notícias\n` +
        `🔹 /help - Ajuda\n\n` +
        `⏰ O bot verifica novas notícias automaticamente a cada 5 minutos!`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

// =====================
// BROADCAST AUTOMÁTICO
// =====================
async function broadcastNews() {
    console.log(`\n⏰ [${new Date().toLocaleTimeString('pt-BR')}] Verificando notícias...`);
    
    try {
        const newArticles = await getNewArticles();
        const users = await db.getUsers();

        if (newArticles && newArticles.length > 0 && users.length > 0) {
            console.log(`📤 Enviando ${newArticles.length} notícias para ${users.length} chats...`);
            
            for (const article of newArticles.slice(0, 3)) {
                const msg = formatArticleMessage(article, true);

                for (const chatId of users) {
                    try {
                        await bot.telegram.sendMessage(chatId, msg, { 
                            parse_mode: 'MarkdownV2',
                            disable_web_page_preview: false 
                        });
                    } catch (err) {
                        if (err.response?.error_code === 403 || err.response?.error_code === 400) {
                            await db.removeUser(chatId);
                            console.log(`🗑️ Usuário ${chatId} removido.`);
                        } else {
                            console.error(`❌ Falha ao enviar para ${chatId}:`, err.message);
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    } catch (error) {
        console.error('❌ Erro no broadcast:', error.message);
    }
}

cron.schedule('*/5 * * * *', () => {
    broadcastNews();
});

// Start on boot
setTimeout(() => broadcastNews(), 3000);

bot.launch().then(() => {
    console.log('============================================');
    console.log('  ⚽ BOTMAN - Football News Bot (Supabase v3)');
    console.log('  ✅ Bot online e pronto!');
    console.log(`  📡 Monitorando ${NEWS_SOURCES.length} fontes`);
    console.log('============================================');
}).catch((err) => {
    console.error('❌ Falha ao iniciar o bot:', err.message);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
