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

async function testFinal() {
    // Vamos testar com a data de HOJE (ou amanhã dependendo do fuso)
    const today = new Date().toISOString().split('T')[0];
    const path = `/api/v1/sport/football/scheduled-events/${today}`;
    
    console.log(`\n🚀 Testando o endereço FINAL: ${path}`);
    try {
        const response = await axiosInstance.get(path);
        console.log('✅ SUCESSO ABSOLUTO!');
        if (response.data.events) {
            console.log(`⚽ Encontrados ${response.data.events.length} jogos.`);
            const first = response.data.events[0];
            console.log(`Exemplo: ${first.homeTeam.name} vs ${first.awayTeam.name} (${first.tournament.name})`);
        } else {
            console.log('⚠️ Sem eventos para esta data.');
        }
    } catch (error) {
        console.log(`❌ Ainda falhou (Status ${error.response?.status}): ${error.message}`);
        if (error.response?.data) console.log('Erro detalhado:', error.response.data);
    }
}

testFinal();
