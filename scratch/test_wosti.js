const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const WOSTI_HOST = 'wosti-futebol-tv-brasil.p.rapidapi.com';

const axiosInstance = axios.create({
    baseURL: `https://${WOSTI_HOST}`,
    headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': WOSTI_HOST
    }
});

async function testWosti() {
    console.log(`\n📺 Testando a API da WOSTI...`);
    try {
        const response = await axiosInstance.get('/api/Events');
        console.log('✅ SUCESSO na WOSTI!');
        
        if (response.data && response.data.length > 0) {
            console.log(`Encontrados ${response.data.length} eventos de TV.`);
            const first = response.data[0];
            console.log('Exemplo de Evento de TV:');
            console.log(JSON.stringify(first, null, 2));
        } else {
            console.log('⚠️ A resposta foi vazia. Veja a resposta bruta:');
            console.log(response.data);
        }
    } catch (error) {
        console.error(`❌ Falhou (Status ${error.response?.status}): ${error.message}`);
        if (error.response?.data) {
             console.error('Detalhes:', error.response.data);
        }
    }
}

testWosti();
