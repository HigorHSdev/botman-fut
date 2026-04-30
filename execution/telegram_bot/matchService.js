const axios = require('axios');
const path = require('path');
const db = require('./database');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'sportapi7.p.rapidapi.com';

const axiosInstance = axios.create({
    baseURL: `https://${RAPIDAPI_HOST}`,
    headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
});

const wostiInstance = axios.create({
    baseURL: `https://wosti-futebol-tv-brasil.p.rapidapi.com`,
    headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'wosti-futebol-tv-brasil.p.rapidapi.com'
    }
});

/**
 * Busca jogos na WOSTI para pegar os canais exatos
 */
async function getWostiChannels() {
    try {
        const response = await wostiInstance.get('/api/Events');
        return response.data || [];
    } catch (error) {
        console.error('❌ Erro na WOSTI:', error.message);
        return [];
    }
}

/**
 * Busca jogos agendados para uma data específica
 */
async function getMatchesByDate(dateStr) {
    try {
        console.log(`⚽ Buscando jogos para a data: ${dateStr}`);
        // O formato correto para esta API é /api/v1/sport/football/scheduled-events/{date}
        const response = await axiosInstance.get(`/api/v1/sport/football/scheduled-events/${dateStr}`);

        return response.data.events || [];
    } catch (error) {
        console.error('❌ Erro ao buscar jogos:', error.message);
        return [];
    }
}

/**
 * Busca odds para um evento específico
 */
async function getOdds(eventId) {
    try {
        const response = await axiosInstance.get(`/api/v1/event/${eventId}/odds/all`);
        // Geralmente retorna uma lista de mercados (vitoria, empate, etc)
        // Precisamos filtrar o mercado de "Full Time Result"
        return response.data.markets || [];
    } catch (error) {
        // Silencioso se não houver odds
        return [];
    }
}

/**
 * Formata as odds de forma amigável
 */
function formatOdds(markets) {
    const mainMarket = markets.find(m => m.name === 'Full Time' || m.name === 'Match Winner');
    if (!mainMarket || !mainMarket.choices) return 'Odds não disponíveis';

    const home = mainMarket.choices.find(c => c.name === '1' || c.name === 'Home');
    const draw = mainMarket.choices.find(c => c.name === 'X' || c.name === 'Draw');
    const away = mainMarket.choices.find(c => c.name === '2' || c.name === 'Away');

    if (!home || !draw || !away) return 'Odds incompletas';

    return `📈 *Odds (1/X/2):*\n` +
           `• Casa: ${home.fractionalValue || home.value}\n` +
           `• Empate: ${draw.fractionalValue || draw.value}\n` +
           `• Fora: ${away.fractionalValue || away.value}`;
}

/**
 * Retorna jogos que começam nos próximos 30-45 minutos
 */
/**
 * Retorna jogos que começam nos próximos 30-45 minutos
 */
async function getUpcomingAlerts() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const allMatches = await getMatchesByDate(dateStr);
    const upcoming = [];

    if (!allMatches || allMatches.length === 0) return upcoming;

    // Buscar canais na WOSTI
    const wostiEvents = await getWostiChannels();

    for (const match of allMatches) {
        const startTime = new Date(match.startTimestamp * 1000);
        const diffMinutes = (startTime - now) / (1000 * 60);

        // Alerta entre 25 e 40 minutos antes do jogo
        if (diffMinutes >= 25 && diffMinutes <= 40) {
            const oddsMarkets = await getOdds(match.id);
            
            // Tentar achar o canal exato
            let canalExato = null;
            const homeName = match.homeTeam.name.toLowerCase().substring(0, 5);
            const awayName = match.awayTeam.name.toLowerCase().substring(0, 5);
            
            const wostiMatch = wostiEvents.find(w => 
                w.LocalTeam.Name.toLowerCase().includes(homeName) || 
                w.AwayTeam.Name.toLowerCase().includes(awayName)
            );

            if (wostiMatch && wostiMatch.Channels && wostiMatch.Channels.length > 0) {
                canalExato = wostiMatch.Channels.map(c => c.Name).join(' / ');
            }

            upcoming.push({
                id: match.id,
                homeTeam: match.homeTeam.name,
                awayTeam: match.awayTeam.name,
                startTime: startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                tournament: match.tournament.name,
                odds: formatOdds(oddsMarkets),
                broadcasting: canalExato ? `⭐ ${canalExato}` : 'Canais de Esporte (SporTV, Premiere, ESPN)'
            });
        }
    }

    return upcoming;
}

/**
 * Retorna um resumo de todos os jogos do dia
 */
async function getDailySummary() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const allMatches = await getMatchesByDate(dateStr);
    if (!allMatches || allMatches.length === 0) return null;

    // Buscar canais exatos na WOSTI
    const wostiEvents = await getWostiChannels();

    // Agrupar por torneio para ficar organizado
    const tournaments = {};
    
    // Pegar apenas os primeiros 30 para não estourar o limite do Telegram
    const limitedMatches = allMatches.slice(0, 30);

    for (const match of limitedMatches) {
        const tournamentName = match.tournament.name;
        if (!tournaments[tournamentName]) tournaments[tournamentName] = [];
        
        const startTime = new Date(match.startTimestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Tentar encontrar o canal exato na WOSTI cruzando os nomes dos times
        let canalExato = null;
        
        const homeName = match.homeTeam.name.toLowerCase().substring(0, 5);
        const awayName = match.awayTeam.name.toLowerCase().substring(0, 5);
        
        const wostiMatch = wostiEvents.find(w => 
            w.LocalTeam.Name.toLowerCase().includes(homeName) || 
            w.AwayTeam.Name.toLowerCase().includes(awayName)
        );

        if (wostiMatch && wostiMatch.Channels && wostiMatch.Channels.length > 0) {
            canalExato = wostiMatch.Channels.map(c => c.Name).join(' / ');
        }

        // Lógica de "adivinhar" o canal como fallback
        let canalFallback = 'Canais de Esporte';
        let link = '';

        const name = tournamentName.toLowerCase();
        if (name.includes('champions')) { canalFallback = 'TNT / Max'; link = 'https://www.max.com/'; }
        else if (name.includes('brasileiro') || name.includes('serie a')) { canalFallback = 'Globo / Premiere / SporTV'; link = 'https://globoplay.globo.com/categorias/esportes/'; }
        else if (name.includes('premier league') || name.includes('la liga') || name.includes('serie a italy')) { canalFallback = 'ESPN / Disney+'; link = 'https://www.disneyplus.com/'; }
        else if (name.includes('libertadores')) { canalFallback = 'Globo / ESPN / Paramount+'; }

        // Usa o exato se achar, senão usa o fallback
        const canalFinal = canalExato ? `⭐ ${canalExato}` : canalFallback;

        const matchLine = `• ${startTime} - *${match.homeTeam.name}* vs *${match.awayTeam.name}*\n  📺 ${canalFinal}${link && !canalExato ? ` [Assistir](${link})` : ''}`;
        tournaments[tournamentName].push(matchLine);
    }

    let msg = `📅 *JOGOS DE HOJE (${now.toLocaleDateString('pt-BR')})*\n\n`;
    
    for (const [name, games] of Object.entries(tournaments)) {
        msg += `🏆 *${name}*\n${games.join('\n')}\n\n`;
    }

    msg += `_Obs: Horários de Brasília_`;
    return msg;
}

module.exports = { getUpcomingAlerts, getDailySummary };
