const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const path = require('path');
const http = require('http'); // Para o Health Check do Render
const db = require('./database');
const { getNewArticles, NEWS_SOURCES, formatArticleMessage } = require('./newsService');
const { getUpcomingAlerts, getDailySummary } = require('./matchService');
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

// Middleware de Logging para depuração
bot.use((ctx, next) => {
    if (ctx.message || ctx.callback_query) {
        const from = ctx.from?.first_name || 'Desconhecido';
        const type = ctx.chat?.type || 'unknown';
        const text = ctx.message?.text || '[Outro tipo de mensagem]';
        console.log(`📩 [${type}] Mensagem de ${from}: ${text}`);
    }
    return next();
});

// Register chat (user or group)
async function registerChat(ctx) {
    const chatId = ctx.chat.id;
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    // Limpar nomes de grupo/usuário para não quebrar o Markdown v1
    const rawName = isGroup ? ctx.chat.title : (ctx.from?.first_name || 'Usuário');
    const chatName = rawName.replace(/[_*`]/g, ''); 

    if (await db.saveUser(chatId, chatName)) {
        const welcomeMsg = `⚽ *Bem-vindo ao Botman!*\n\n` +
            `${chatName}, você agora receberá as últimas notícias do futebol em tempo real!\n\n` +
            `📡 *Fontes:* Brasil (GE, TNT, UOL) + Internacional (BBC, Sky, Marca...)\n` +
            `⏰ *Atualização:* Automática a cada 5 minutos\n\n` +
            `🔹 /jogos - Ver jogos de hoje\n` +
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

bot.command('jogos', async (ctx) => {
    console.log(`👤 Usuário ${ctx.from.username} pediu os jogos do dia.`);
    try {
        await ctx.reply('⏳ Buscando a lista de jogos de hoje...');
        const summary = await getDailySummary();
        if (summary) {
            await ctx.replyWithMarkdown(summary);
        } else {
            await ctx.reply('⚠️ Não encontrei jogos agendados para hoje.');
        }
    } catch (err) {
        console.error('Erro no comando /jogos:', err.message);
        await ctx.reply('❌ Erro ao buscar jogos. Tente novamente.');
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
                    await db.saveSentNews(article.url);
                } catch (err) {
                    await ctx.reply(`${article.emoji} ${article.title}\n\n${article.url}`);
                    await db.saveSentNews(article.url);
                }
                await new Promise(r => setTimeout(r, 500));
            }
            if (articles.length > 5) {
                await ctx.reply(`📊 Mostrando 5 de ${articles.length} notícias novas encontradas.`);
            }
        }
    } catch (error) {
        console.error('Erro no /latest:', error.message);
        await ctx.reply('❌ Erro ao buscar notícias.');
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
    const msg = `🤖 *Botman - Help*\n\n` +
        `🔹 /jogos - Lista de jogos do dia\n` +
        `🔹 /latest - Últimas notícias\n` +
        `🔹 /fontes - Fontes de notícias\n` +
        `🔹 /debug - Status do bot\n\n` +
        `⏰ Alertas automáticos 30min antes dos jogos!`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('debug', async (ctx) => {
    try {
        const users = await db.getUsers();
        const msg = `🤖 *Status do Botman*\n\n` +
            `👥 *Usuários:* ${users.length}\n` +
            `📡 *Fontes:* ${NEWS_SOURCES.length}\n` +
            `⏱ *Hora:* ${new Date().toLocaleTimeString('pt-BR')}\n` +
            `🔑 *API Jogos:* ${process.env.RAPIDAPI_KEY ? 'Configurada ✅' : 'Ausente ❌'}\n` +
            `🔗 *DB:* Supabase (PostgreSQL)`;
        ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
        ctx.reply(`❌ Erro no banco: ${err.message}`);
    }
});

// =====================
// BROADCASTS
// =====================

async function broadcastNews() {
    console.log(`\n⏰ [${new Date().toLocaleTimeString('pt-BR')}] Verificando notícias...`);
    try {
        const newArticles = await getNewArticles();
        const users = await db.getUsers();
        if (!newArticles || newArticles.length === 0 || users.length === 0) return;

        for (const article of newArticles.slice(0, 10)) {
            const msg = formatArticleMessage(article, true);
            for (const chatId of users) {
                try {
                    await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' });
                } catch (err) {
                    if (err.response?.error_code === 403) await db.removeUser(chatId);
                }
                await new Promise(r => setTimeout(r, 50));
            }
            await db.saveSentNews(article.url);
            await new Promise(r => setTimeout(r, 1000));
        }
    } catch (error) {
        console.error('❌ Erro no broadcast news:', error.message);
    }
}

async function broadcastMatchAlerts() {
    console.log(`\n🕒 [${new Date().toLocaleTimeString('pt-BR')}] Verificando próximos jogos...`);
    try {
        const matches = await getUpcomingAlerts();
        const users = await db.getUsers();
        if (!matches || matches.length === 0 || users.length === 0) return;

        for (const match of matches) {
            const msg = `⚽ *JOGO EM BREVE (30 MIN)*\n\n` +
                        `🏆 *${match.tournament}*\n` +
                        `🆚 *${match.homeTeam}* vs *${match.awayTeam}*\n` +
                        `⏰ Início: ${match.startTime}\n\n` +
                        `${match.odds}\n\n` +
                        `📺 *Onde assistir:* ${match.broadcasting}`;

            for (const chatId of users) {
                try {
                    if (!(await db.isMatchAlertSent(match.id.toString(), chatId))) {
                        await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
                        await db.saveMatchAlert(match.id.toString(), chatId);
                    }
                } catch (err) {
                    console.error('Erro match alert:', err.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro broadcast matches:', error.message);
    }
}

async function broadcastDailySummary() {
    console.log(`\n📅 [${new Date().toLocaleTimeString('pt-BR')}] Enviando resumo diário...`);
    try {
        const summary = await getDailySummary();
        const users = await db.getUsers();
        if (summary && users.length > 0) {
            for (const chatId of users) {
                try {
                    await bot.telegram.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
                } catch (err) {
                    console.error('Erro resumo diário:', err.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro resumo diário:', error.message);
    }
}

// =====================
// SCHEDULING
// =====================

cron.schedule('*/5 * * * *', () => broadcastNews());
cron.schedule('*/10 * * * *', () => broadcastMatchAlerts());
cron.schedule('0 0 * * *', () => broadcastDailySummary());

// Start
setTimeout(() => broadcastNews(), 3000);

bot.launch().then(() => {
    console.log('✅ Botman online (Supabase v3 + Match Alerts)');
}).catch(err => console.error('❌ Falha launch:', err.message));

bot.catch((err) => console.error('💥 Erro Telegraf:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
