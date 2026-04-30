const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'sportapi7.p.rapidapi.com';

const axiosInstance = axios.create({
    baseURL: `https://${RAPIDAPI_HOST}`,
    headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
    }
});

async function inspectMatchDetails() {
    const today = new Date().toISOString().split('T')[0];
    const path = `/api/v1/sport/football/scheduled-events/${today}`;
    
    try {
        const response = await axiosInstance.get(path);
        if (response.data.events && response.data.events.length > 0) {
            const match = response.data.events[0];
            console.log('🔍 Inspecionando campos do jogo:', match.homeTeam.name, 'vs', match.awayTeam.name);
            console.log('Todos os campos disponíveis no objeto "match":');
            console.log(Object.keys(match));
            
            // Procurar por campos relacionados a TV ou Canais
            const tvFields = Object.keys(match).filter(k => k.toLowerCase().includes('tv') || k.toLowerCase().includes('channel') || k.toLowerCase().includes('broadcast'));
            if (tvFields.length > 0) {
                console.log('✅ Campos de TV encontrados:', tvFields);
                tvFields.forEach(f => console.log(`${f}:`, match[f]));
            } else {
                console.log('❌ Nenhum campo de TV óbvio encontrado no primeiro nível.');
            }
        }
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

inspectMatchDetails();
