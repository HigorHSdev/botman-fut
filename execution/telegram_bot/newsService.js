const RSSParser = require('rss-parser');
const db = require('./database');

let translate;
// google-translate-api-x é ESM, precisamos importar dinamicamente
async function loadTranslator() {
    if (!translate) {
        const module = await import('google-translate-api-x');
        translate = module.default || module.translate;
    }
    return translate;
}

const parser = new RSSParser({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
    }
});

// ============================================================
// FONTES DE NOTÍCIAS
// ============================================================
const NEWS_SOURCES = [
    // === BRASIL (Sem tradução necessária) ===
    {
        name: '⚽ Globo Esporte',
        url: 'https://ge.globo.com/rss/ge/futebol/',
        audience: 10,
        emoji: '🇧🇷',
        isPortuguese: true
    },
    {
        name: '⚽ ESPN Brasil',
        url: 'https://www.espn.com.br/espn/rss/futebol',
        audience: 10,
        emoji: '🇧🇷',
        isPortuguese: true
    },
    {
        name: '⚽ Gazeta Esportiva',
        url: 'https://www.gazetaesportiva.com/futebol/feed/',
        audience: 8,
        emoji: '🇧🇷',
        isPortuguese: true
    },
    // === INTERNACIONAL (Tradução automática) ===
    {
        name: '⚽ BBC Sport Football',
        url: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
        audience: 10,
        emoji: '🇬🇧'
    },
    {
        name: '⚽ Sky Sports Football',
        url: 'https://www.skysports.com/rss/12040',
        audience: 9,
        emoji: '📺'
    },
    {
        name: '⚽ Marca (Espanha)',
        url: 'https://e00-marca.uecdn.es/rss/futbol/futbol-internacional.xml',
        audience: 9,
        emoji: '🇪🇸'
    },
    {
        name: '⚽ The Guardian',
        url: 'https://www.theguardian.com/football/rss',
        audience: 10,
        emoji: '📰'
    },
    {
        name: '⚽ AS.com',
        url: 'https://as.com/rss/tags/futbol.xml',
        audience: 8,
        emoji: '🇪🇸'
    },
    {
        name: '⚽ talkSPORT',
        url: 'https://talksport.com/football/feed/',
        audience: 8,
        emoji: '🎙️'
    },
    {
        name: '⚽ OneFootball',
        url: 'https://onefootball.com/en/feeds/rss',
        audience: 8,
        emoji: '📱'
    }
];

const FOOTBALL_KEYWORDS = [
    'futebol', 'football', 'soccer', 'ballon d\'or', 'champions league', 'premier league', 
    'la liga', 'serie a', 'bundesliga', 'ligue 1', 'libertadores', 'brasileirão', 
    'copa do mundo', 'world cup', 'fifa', 'uefa', 'conmebol', 'transfer', 'mercado da bola', 
    'gol', 'goal', 'var', 'pênalti', 'penalty', 'estádio', 'stadium', 'treinador', 'manager', 
    'escalação', 'lineup', 'clássico', 'derby', 'campeonato', 'league', 'cup', 'torneio',
    'contratação', 'reforço', 'seleção'
];

function isFootballRelated(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();
    return FOOTBALL_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

// Audiência mínima para passar no filtro
const MIN_AUDIENCE = 7;

/**
 * Traduz um texto para Português do Brasil
 */
async function translateToPtBr(text) {
    if (!text || text.trim().length === 0) return text;

    try {
        const translator = await loadTranslator();
        const result = await translator(text, { from: 'auto', to: 'pt' });
        return result.text;
    } catch (error) {
        console.log(`⚠️  Falha na tradução: ${error.message}`);
        return text; 
    }
}

/**
 * Traduz título e descrição de um artigo (se não estiver em PT)
 */
async function translateArticle(article) {
    if (article.isPortuguese) return article;

    try {
        const [translatedTitle, translatedDesc] = await Promise.all([
            translateToPtBr(article.title),
            translateToPtBr(article.description ? article.description.substring(0, 300) : '')
        ]);

        return {
            ...article,
            title: translatedTitle,
            description: translatedDesc,
        };
    } catch (error) {
        console.log(`⚠️  Erro ao traduzir artigo: ${error.message}`);
        return article;
    }
}

/**
 * Busca notícias de uma única fonte RSS
 */
async function fetchFromSource(source, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const feed = await parser.parseURL(source.url);
            const articles = (feed.items || []).slice(0, 8).map(item => ({
                title: item.title || 'Sem título',
                description: item.contentSnippet || item.content || item.summary || '',
                url: item.link || '',
                source: source.name,
                emoji: source.emoji,
                audience: source.audience,
                isPortuguese: !!source.isPortuguese,
                pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            }));
            return articles;
        } catch (error) {
            console.log(`⚠️  Tentativa ${attempt}/${retries} falhou para ${source.name}: ${error.message}`);
            if (attempt === retries) return [];
            await new Promise(r => setTimeout(r, attempt * 1000));
        }
    }
    return [];
}

/**
 * Busca notícias de TODAS as fontes em paralelo
 */
async function fetchFootballNews() {
    console.log(`🔍 Buscando notícias de ${NEWS_SOURCES.length} fontes...`);

    const results = await Promise.allSettled(
        NEWS_SOURCES
            .filter(s => s.audience >= MIN_AUDIENCE)
            .map(source => fetchFromSource(source))
    );

    let allArticles = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            const filtered = result.value.filter(isFootballRelated);
            allArticles.push(...filtered);
        }
    }

    allArticles = removeDuplicates(allArticles);
    allArticles.sort((a, b) => b.pubDate - a.pubDate);

    console.log(`📊 Total de notícias filtradas: ${allArticles.length}`);
    return allArticles;
}

/**
 * Remove notícias duplicadas
 */
function removeDuplicates(articles) {
    const seenUrls = new Set();
    const seenTitles = new Set();
    
    return articles.filter(article => {
        if (seenUrls.has(article.url)) return false;
        
        const normalizedTitle = article.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 60);
            
        if (seenTitles.has(normalizedTitle)) return false;
        
        seenUrls.add(article.url);
        seenTitles.add(normalizedTitle);
        return true;
    });
}

/**
 * Escapa caracteres especiais para MarkdownV2
 */
function escapeMarkdownV2(text) {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Formata um artigo para mensagem do Telegram
 */
function formatArticleMessage(article, isBroadcast = false) {
    const title = escapeMarkdownV2(article.title);
    const source = escapeMarkdownV2(article.source);
    let desc = article.description || '';
    if (desc.length > 200) desc = desc.substring(0, 200) + '...';
    desc = escapeMarkdownV2(desc);

    const header = isBroadcast ? '🔥 *NOVA NOTÍCIA*\n\n' : '';

    return `${header}${article.emoji} *${title}*\n\n` +
           `${desc}\n\n` +
           `📰 _${source}_\n` +
           `🔗 [Leia mais](${article.url})`;
}

/**
 * Retorna apenas artigos novos, já traduzidos para PT-BR
 */
async function getNewArticles() {
    const articles = await fetchFootballNews();
    const newArticles = [];

    // Filtrar novos artigos de forma assíncrona
    for (const article of articles) {
        const alreadySent = await db.isNewsSent(article.url);
        if (!alreadySent) {
            newArticles.push(article);
        }
    }

    if (newArticles.length > 0) {
        // Marcar como enviadas no banco (async)
        for (const article of newArticles) {
            await db.saveSentNews(article.url);
        }

        console.log(`🌐 Processando ${newArticles.length} notícias...`);
        const processedArticles = [];
        for (const article of newArticles) {
            const processed = await translateArticle(article);
            processedArticles.push(processed);
            if (!article.isPortuguese) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        console.log(`✅ Processamento concluído!`);
        return processedArticles;
    }

    return [];
}

module.exports = { getNewArticles, NEWS_SOURCES, formatArticleMessage };
